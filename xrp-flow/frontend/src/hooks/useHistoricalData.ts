import { useQuery } from "@tanstack/react-query";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, isDeployed, deploymentInfo } from "../contracts";
import { coston2 } from "../wagmi";

interface HistoricalAPYPoint {
  timestamp: number; // Unix timestamp
  kineticAPY: number;
  morphoAPY: number;
  bestAPY: number;
}

/**
 * Hook to fetch and calculate historical APY data from MockAPYUpdated events.
 */
export function useHistoricalData() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled = isDeployed && isConnected && onCorrectNetwork && !!publicClient;

  return useQuery({
    queryKey: ["historical-data", chainId],
    enabled,
    queryFn: async () => {
      if (!publicClient) {
        return {
          apyHistory: [],
          currentKineticAPY: 0,
          currentMorphoAPY: 0,
          currentBestAPY: 0
        };
      }

      // Get current APY values first
      let kineticRaw: bigint = 0n;
      let morphoResult: bigint = 0n;

      try {
        const kineticResult = await publicClient.readContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "kineticMockAPY"
        });
        kineticRaw = Array.isArray(kineticResult) && kineticResult.length > 0 ? kineticResult[0] : 0n;
      } catch (err) {
        console.error("[useHistoricalData] readContract kineticMockAPY failed", { error: err });
      }

      try {
        const morphoResultTuple = await publicClient.readContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "morphoMockAPY"
        });
        morphoResult = Array.isArray(morphoResultTuple) && morphoResultTuple.length > 0 ? morphoResultTuple[0] : 0n;
      } catch (err) {
        console.error("[useHistoricalData] readContract morphoMockAPY failed", { error: err });
      }

      const kineticAPY = Number(formatUnits(kineticRaw, 18)) * 100;
      const morphoAPY = Number(formatUnits(morphoResult, 18)) * 100;
      const bestAPY = Math.max(kineticAPY, morphoAPY);

      // Fetch block number safely
      let toBlock: bigint;
      try {
        toBlock = await publicClient.getBlockNumber();
      } catch (err) {
        console.error("[useHistoricalData] getBlockNumber failed", { error: err });
        toBlock = 0n;
      }

      // Calculate safe fromBlock to prevent RPC range limit errors (max 5000 blocks back)
      // Note: Coston2 public RPC can be very strict. If 1000 fails, try lowering this to 100n.
      const MAX_BLOCK_RANGE = 29n;
      const configuredDeployBlock = deploymentInfo.deployBlock ? BigInt(deploymentInfo.deployBlock) : 0n;

      let fromBlock: bigint;
      if (configuredDeployBlock > 0n && toBlock > configuredDeployBlock && (toBlock - configuredDeployBlock) <= MAX_BLOCK_RANGE) {
        fromBlock = configuredDeployBlock;
      } else {
        fromBlock = toBlock > MAX_BLOCK_RANGE ? toBlock - MAX_BLOCK_RANGE : 0n;
      }

      // Fetch MockAPYUpdated events
      let logs: any[] = [];
      if (toBlock > 0n && CONTRACTS.yieldRouter.address) {
        try {
          
          // Debugger safely moved OUTSIDE of the object literal
          console.log("RPC Payload Check:", {
            address: CONTRACTS.yieldRouter.address,
            fromBlock: fromBlock.toString(),
            toBlock: toBlock.toString(),
            rangeSize: (toBlock - fromBlock).toString(),
          });

          const events = await publicClient.getContractEvents({
            address: CONTRACTS.yieldRouter.address,
            abi: CONTRACTS.yieldRouter.abi,
            eventName: "MockAPYUpdated",
            fromBlock,
            toBlock
          });
          
          logs = Array.isArray(events) ? events : [];
        } catch (err) {
          console.error("[useHistoricalData] getContractEvents failed", { error: err });
          logs = [];
        }
      }

      // Process events into historical data points
      const apyHistory: HistoricalAPYPoint[] = [];

      for (const log of logs) {
        if (!log || !log.args) {
          console.warn("[useHistoricalData] Skipping log with missing args", { log });
          continue;
        }

        let timestamp: number;
        try {
          if (log.blockNumber) {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            timestamp = Number(block.timestamp);
          } else {
            timestamp = Date.now() / 1000;
          }
        } catch {
          timestamp = Date.now() / 1000;
        }

        let venue: number | undefined;
        let newAPY: bigint | undefined;

        try {
          venue = Number(log.args.venue);
          newAPY = log.args.newAPY;
        } catch (err) {
          console.error("[useHistoricalData] Failed to parse event args", { error: err, log });
          continue;
        }

        if (isNaN(venue) || !newAPY) {
          console.warn("[useHistoricalData] Skipping log with invalid args", { venue, newAPY, log });
          continue;
        }

        const newAPYNumber = Number(formatUnits(newAPY, 18)) * 100;

        let existingPoint = apyHistory.find(point =>
          Math.abs(point.timestamp - timestamp) < 1
        );

        if (!existingPoint) {
          existingPoint = {
            timestamp: Math.floor(timestamp),
            kineticAPY: venue === 0 ? newAPYNumber : kineticAPY,
            morphoAPY: venue === 1 ? newAPYNumber : morphoAPY,
            bestAPY: 0
          };
          apyHistory.push(existingPoint);
        } else {
          if (venue === 0) {
            existingPoint.kineticAPY = newAPYNumber;
          } else {
            existingPoint.morphoAPY = newAPYNumber;
          }
        }

        existingPoint.bestAPY = Math.max(existingPoint.kineticAPY, existingPoint.morphoAPY);
      }

      // Add current values as the most recent point if no recent data exists
      const now = Date.now() / 1000;
      if (
        apyHistory.length === 0 ||
        Math.abs(apyHistory[apyHistory.length - 1].timestamp - now) > 300
      ) {
        apyHistory.push({
          timestamp: Math.floor(now),
          kineticAPY,
          morphoAPY,
          bestAPY
        });
      }

      apyHistory.sort((a, b) => a.timestamp - b.timestamp);

      if (apyHistory.length > 168) {
        apyHistory.splice(0, apyHistory.length - 168);
      }

      return {
        apyHistory: Array.isArray(apyHistory) ? apyHistory : [],
        currentKineticAPY: (typeof kineticAPY === 'number' && !isNaN(kineticAPY)) ? kineticAPY : 0,
        currentMorphoAPY: (typeof morphoAPY === 'number' && !isNaN(morphoAPY)) ? morphoAPY : 0,
        currentBestAPY: (typeof bestAPY === 'number' && !isNaN(bestAPY)) ? bestAPY : 0
      };
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Calculate projected yield based on current APY and deposit amount
 */
export function calculateProjectedYield(
  depositAmount: number,
  apy: number,
  compoundFrequency: number = 365
): number {
  const principal = depositAmount;
  const rate = apy / 100;
  const n = compoundFrequency;
  const t = 1;

  const finalAmount = principal * Math.pow(1 + rate / n, n * t);
  return finalAmount - principal;
}

/**
 * Calculate progress to next reputation tier
 */
export function calculateTierProgress(
  currentScore: bigint,
  bronzeThreshold: bigint,
  silverThreshold: bigint,
  goldThreshold: bigint
): {
  currentTier: number;
  progressToNext: number;
  nextTierThreshold: bigint;
  nextTierName: string;
} {
  let currentTier = 0;
  let nextTierThreshold = bronzeThreshold;
  let nextTierName = "Bronze";

  if (currentScore >= goldThreshold) {
    currentTier = 3;
    nextTierThreshold = goldThreshold;
    nextTierName = "Max Tier";
  } else if (currentScore >= silverThreshold) {
    currentTier = 2;
    nextTierThreshold = goldThreshold;
    nextTierName = "Gold";
  } else if (currentScore >= bronzeThreshold) {
    currentTier = 1;
    nextTierThreshold = silverThreshold;
    nextTierName = "Silver";
  } else {
    currentTier = 0;
    nextTierThreshold = bronzeThreshold;
    nextTierName = "Bronze";
  }

  let progressToNext = 0;
  if (currentTier < 3) {
    const currentTierStart =
      currentTier === 0 ? 0n :
      currentTier === 1 ? bronzeThreshold :
      silverThreshold;

    const tierRange = nextTierThreshold - currentTierStart;
    const progressInTier = currentScore - currentTierStart;

    if (tierRange > 0) {
      progressToNext = Number((progressInTier * 100n) / tierRange);
      progressToNext = Math.min(100, Math.max(0, progressToNext));
    }
  } else {
    progressToNext = 100;
  }

  return {
    currentTier,
    progressToNext,
    nextTierThreshold,
    nextTierName
  };
}