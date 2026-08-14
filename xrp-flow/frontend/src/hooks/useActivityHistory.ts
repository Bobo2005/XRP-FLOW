import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useAccount, useChainId } from "wagmi";
import { formatUnits, type Address } from "viem";
import { CONTRACTS, isDeployed, deploymentInfo, venueNameFromIndex } from "../contracts";
import { coston2 } from "../wagmi";
import type { ActivityItem } from "../types";

type ActivityLog = {
  eventName: "Deposited" | "Withdrawn";
  args: { user?: Address; amount?: bigint; venue?: number };
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
  logIndex: number | null;
};

/**
 * Scans Deposited/Withdrawn event logs for the connected wallet and turns
 * them into ActivityItem rows, newest first. Scans from the router's
 * deployment block (see deployBlock in deployed-addresses.json) rather
 * than block 0, so this stays fast even as the chain grows.
 */
export function useActivityHistory(decimals: number) {
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled =
    isDeployed && isConnected && onCorrectNetwork && !!address && !!publicClient;

  return useQuery({
    queryKey: ["activity-history", address, CONTRACTS.yieldRouter.address, chainId],
    enabled,
    queryFn: async () => {
      if (!publicClient || !address) return [];

      const fromBlock =
        deploymentInfo.deployBlock != null
          ? BigInt(deploymentInfo.deployBlock)
          : 0n;

      let toBlock: bigint;
      try {
        toBlock = await publicClient.getBlockNumber();
      } catch (err) {
        console.error("[useActivityHistory] getBlockNumber failed", { error: err });
        throw err;
      }

      let allLogsRaw: Awaited<ReturnType<typeof publicClient.getContractEvents>>;
      try {
        // Coston2's RPC caps eth_getLogs at a 30-block range per call
        // (confirmed via InvalidInputRpcError: "requested too many
        // blocks... maximum is set to 30") — far smaller than most
        // providers. Chunk the full range into 30-block windows and fetch
        // each separately. No `eventName` filter, so each chunk grabs
        // every event the ABI defines (Deposited + Withdrawn) in one call
        // instead of two. No `args: { user }` filter either — that needs
        // an extra indexed-argument topic this node also seemed to
        // reject — filtering by user happens client-side below instead.
        allLogsRaw = await fetchLogsInChunks(
          publicClient,
          CONTRACTS.yieldRouter,
          fromBlock,
          toBlock
        );
      } catch (err) {
        console.error("[useActivityHistory] getContractEvents failed", {
          fromBlock,
          toBlock,
          address,
          yieldRouter: CONTRACTS.yieldRouter.address,
          error: err,
        });
        throw err;
      }

      const addressLower = address.toLowerCase();
      const allLogs = (allLogsRaw as unknown as ActivityLog[]).filter((log) => {
        const user = log.args.user;
        return user?.toLowerCase() === addressLower;
      });
      if (allLogs.length === 0) return [];

      // Logs only carry a block number, not a timestamp — fetch each
      // referenced block once (deduped) to get real dates.
      const uniqueBlockNumbers = Array.from(
        new Set(allLogs.map((log) => log.blockNumber))
      ).filter((bn): bn is bigint => bn !== null);

      let blocks;
      try {
        blocks = await Promise.all(
          uniqueBlockNumbers.map((blockNumber) =>
            publicClient.getBlock({ blockNumber })
          )
        );
      } catch (err) {
        console.error("[useActivityHistory] getBlock failed", {
          uniqueBlockNumbers,
          error: err,
        });
        throw err;
      }
      const timestampByBlock = new Map(
        blocks.map((block) => [block.number, block.timestamp])
      );

      const items: ActivityItem[] = allLogs.map((log) => {
        const isDeposit = log.eventName === "Deposited";
        const args = log.args;
        const amountRaw = args.amount ?? 0n;
        const blockTimestamp = log.blockNumber
          ? timestampByBlock.get(log.blockNumber)
          : undefined;

        return {
          id: `${log.transactionHash ?? "unknown"}-${log.logIndex ?? "unknown"}`,
          type: isDeposit ? "Deposit" : "Withdraw",
          amount: Number(formatUnits(amountRaw, decimals)),
          protocol: venueNameFromIndex(args.venue ?? 0),
          timestamp: blockTimestamp
            ? new Date(Number(blockTimestamp) * 1000).toISOString()
            : new Date(0).toISOString(),
          txHash: log.transactionHash ? truncateHash(log.transactionHash) : "unknown",
        };
      });

      // Newest first.
      return items.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
  });
}

function truncateHash(hash: Address | string) {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

// Coston2's confirmed eth_getLogs cap, minus nothing — use the max allowed.
const MAX_BLOCK_RANGE = 30n;
// How many 30-block chunk requests to run at once. Public testnet RPCs
// generally can't handle unlimited parallel requests — too much burst
// traffic risks the RPC gateway throttling this origin, which can
// manifest as a CORS failure in the browser even though the real cause
// is upstream rate-limiting, not an actual CORS policy decision.
const CHUNK_CONCURRENCY = 3;
// Pause between batches, on top of limiting concurrency — spreads the
// request burst out over time instead of hitting the RPC in one spike.
const BATCH_DELAY_MS = 250;
// Hard cap on how far back to scan, regardless of how old the deployment
// is. A deployment that's sat untouched for a long time would otherwise
// mean thousands of chunk requests — this trades "very old activity
// might not show" for "never send an unbounded burst of requests."
// ~1,500 blocks is ~50 chunk requests at the 30-block cap.
const MAX_LOOKBACK_BLOCKS = 1_500n;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches every YieldRouter event (Deposited + Withdrawn — no eventName
 * filter) between fromBlock and toBlock, splitting the range into
 * MAX_BLOCK_RANGE-sized windows to stay under Coston2's per-call limit.
 * Chunk requests run CHUNK_CONCURRENCY at a time with a short pause
 * between batches, and the lookback is capped at MAX_LOOKBACK_BLOCKS —
 * both aimed at not bursting enough requests to get this origin
 * rate-limited by the public RPC gateway.
 */
async function fetchLogsInChunks(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  contract: { address: `0x${string}`; abi: typeof CONTRACTS.yieldRouter.abi },
  fromBlock: bigint,
  toBlock: bigint
) {
  const cappedFromBlock =
    toBlock - fromBlock > MAX_LOOKBACK_BLOCKS
      ? toBlock - MAX_LOOKBACK_BLOCKS
      : fromBlock;

  const ranges: { from: bigint; to: bigint }[] = [];
  for (let start = cappedFromBlock; start <= toBlock; start += MAX_BLOCK_RANGE) {
    const end =
      start + MAX_BLOCK_RANGE - 1n > toBlock ? toBlock : start + MAX_BLOCK_RANGE - 1n;
    ranges.push({ from: start, to: end });
  }

  const allLogs: Awaited<ReturnType<typeof publicClient.getContractEvents>> = [];
  for (let i = 0; i < ranges.length; i += CHUNK_CONCURRENCY) {
    const batch = ranges.slice(i, i + CHUNK_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(({ from, to }) =>
        publicClient.getContractEvents({
          address: contract.address,
          abi: contract.abi,
          fromBlock: from,
          toBlock: to,
        })
      )
    );
    for (const logs of batchResults) allLogs.push(...logs);

    if (i + CHUNK_CONCURRENCY < ranges.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
  return allLogs;
}

