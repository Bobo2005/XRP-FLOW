import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useAccount, useChainId } from "wagmi";
import { formatUnits, type Address } from "viem";
import { CONTRACTS, isDeployed, deploymentInfo, venueNameFromIndex } from "../contracts";
import { coston2 } from "../wagmi";
import type { ActivityItem } from "../types";

const MAX_BLOCK_RANGE = 30n;
const CHUNK_CONCURRENCY = 1; // Sequential execution to prevent 429 rate limits
const BATCH_DELAY_MS = 300;
const INITIAL_LOOKBACK_BLOCKS = 3000n; // ~1.5 hours of blocks on Coston2 for initial scan

interface StoredHistory {
  lastScannedBlock: string;
  items: ActivityItem[];
}

function getStorageKey(address: string, routerAddress: string) {
  return `xrp_flow_history_${address.toLowerCase()}_${routerAddress.toLowerCase()}`;
}

function getStoredHistory(address: string, routerAddress: string): StoredHistory | null {
  try {
    const raw = localStorage.getItem(getStorageKey(address, routerAddress));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredHistory(address: string, routerAddress: string, data: StoredHistory) {
  try {
    localStorage.setItem(getStorageKey(address, routerAddress), JSON.stringify(data));
  } catch (err) {
    console.warn("[useActivityHistory] Failed to write to localStorage", err);
  }
}

export function useActivityHistory(decimals: number) {
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled = isDeployed && isConnected && onCorrectNetwork && !!address && !!publicClient;

  return useQuery({
    queryKey: ["activity-history", address, CONTRACTS.yieldRouter.address, chainId],
    enabled,
    queryFn: async () => {
      if (!publicClient || !address) return [];

      const routerAddress = CONTRACTS.yieldRouter.address;
      const cached = getStoredHistory(address, routerAddress);

      let toBlock: bigint;
      try {
        toBlock = await publicClient.getBlockNumber();
      } catch (err) {
        console.error("[useActivityHistory] getBlockNumber failed", err);
        return cached?.items ?? [];
      }

      // Determine starting block: use local cache, or cap initial scan to INITIAL_LOOKBACK_BLOCKS
      let fromBlock: bigint;
      if (cached?.lastScannedBlock) {
        fromBlock = BigInt(cached.lastScannedBlock) + 1n;
      } else {
        const deployBlock = deploymentInfo.deployBlock != null ? BigInt(deploymentInfo.deployBlock) : 0n;
        const lookbackStart = toBlock > INITIAL_LOOKBACK_BLOCKS ? toBlock - INITIAL_LOOKBACK_BLOCKS : 0n;
        fromBlock = deployBlock > lookbackStart ? deployBlock : lookbackStart;
      }

      // If already up to date, return cached items immediately
      if (fromBlock > toBlock) {
        return cached?.items ?? [];
      }

      // Fetch only NEW logs since last scan
      const newLogsRaw = await fetchLogsInChunks(
        publicClient,
        { address: routerAddress, abi: CONTRACTS.yieldRouter.abi },
        fromBlock,
        toBlock
      );

      const addressLower = address.toLowerCase();

      const filteredLogs = newLogsRaw.filter((log) => {
        const eventName = log.eventName;
        if (eventName !== "Deposited" && eventName !== "Withdrawn") return false;
        const args = log.args as { user?: Address; amount?: bigint; venue?: number };
        return args?.user?.toLowerCase() === addressLower;
      });

      let newItems: ActivityItem[] = [];

      if (filteredLogs.length > 0) {
        const uniqueBlockNumbers = Array.from(
          new Set(filteredLogs.map((log) => log.blockNumber))
        ).filter((bn): bn is bigint => bn !== null);

        let blocks = [];
        try {
          blocks = await Promise.all(
            uniqueBlockNumbers.map((blockNumber) => publicClient.getBlock({ blockNumber }))
          );
        } catch (err) {
          console.warn("[useActivityHistory] getBlock failed for new logs", err);
        }

        const timestampByBlock = new Map(blocks.map((b) => [b.number, b.timestamp]));

        newItems = filteredLogs.map((log) => {
          const args = log.args as { user: Address; amount: bigint; venue: number };
          const blockTimestamp = log.blockNumber ? timestampByBlock.get(log.blockNumber) : undefined;
          const isDeposit = log.eventName === "Deposited";

          return {
            id: `${log.transactionHash ?? "unknown"}-${log.logIndex ?? "unknown"}`,
            type: isDeposit ? "Deposit" : "Withdraw",
            amount: Number(formatUnits(args.amount, decimals)),
            protocol: venueNameFromIndex(args.venue ?? 0),
            timestamp: blockTimestamp
              ? new Date(Number(blockTimestamp) * 1000).toISOString()
              : new Date().toISOString(),
            txHash: log.transactionHash ? truncateHash(log.transactionHash) : "unknown",
          };
        });
      }

      // Merge new items with cached items and deduplicate
      const existingItems = cached?.items ?? [];
      const mergedMap = new Map<string, ActivityItem>();

      [...newItems, ...existingItems].forEach((item) => {
        mergedMap.set(item.id, item);
      });

      const mergedItems = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Save updated history and last block position
      saveStoredHistory(address, routerAddress, {
        lastScannedBlock: toBlock.toString(),
        items: mergedItems,
      });

      return mergedItems;
    },
  });
}

function truncateHash(hash: Address | string) {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

async function fetchLogsInChunks(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  contract: { address: `0x${string}`; abi: typeof CONTRACTS.yieldRouter.abi },
  fromBlock: bigint,
  toBlock: bigint
) {
  const ranges: { from: bigint; to: bigint }[] = [];
  for (let start = fromBlock; start <= toBlock; start += MAX_BLOCK_RANGE) {
    const end = start + MAX_BLOCK_RANGE - 1n > toBlock ? toBlock : start + MAX_BLOCK_RANGE - 1n;
    ranges.push({ from: start, to: end });
  }

  const allLogs: Awaited<ReturnType<typeof publicClient.getContractEvents>> = [];
  for (let i = 0; i < ranges.length; i += CHUNK_CONCURRENCY) {
    const batch = ranges.slice(i, i + CHUNK_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(async ({ from, to }) => {
        try {
          return await publicClient.getContractEvents({
            address: contract.address,
            abi: contract.abi,
            fromBlock: from,
            toBlock: to,
          });
        } catch (err) {
          console.warn(`[useActivityHistory] Chunk ${from}-${to} failed:`, err);
          return [];
        }
      })
    );

    for (const logs of batchResults) allLogs.push(...logs);

    if (i + CHUNK_CONCURRENCY < ranges.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
  return allLogs;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}