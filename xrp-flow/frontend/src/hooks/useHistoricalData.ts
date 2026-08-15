

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

      // Get current APY values first with fallback handling
      let kineticRaw: bigint = 0n;
      let morphoResult: bigint = 0n;

      try {
        const kineticResult = await publicClient.readContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "kineticMockAPY"
        });
        kineticRaw = Array.isArray(kineticResult) && kineticResult.length > 0 ? BigInt(kineticResult[0] as string | number | bigint) : 0n;
      } catch (err) {
        console.error("[useHistoricalData] readContract kineticMockAPY failed", { error: err });
      }

      try {
        const morphoResultTuple = await publicClient.readContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "morphoMockAPY"
        });
        morphoResult = Array.isArray(morphoResultTuple) && morphoResultTuple.length > 0 ? BigInt(morphoResultTuple[0] as string | number | bigint) : 0n;
      } catch (err) {
        console.error("[useHistoricalData] readContract morphoMockAPY failed", { error: err });
      }

      const kineticAPY = Number(formatUnits(kineticRaw, 18)) * 100;
      const morphoAPY = Number(formatUnits(morphoResult, 18)) * 100;
      const bestAPY = Math.max(isNaN(kineticAPY) ? 0 : kineticAPY, isNaN(morphoAPY) ? 0 : morphoAPY);

      // Fetch block number safely
      let toBlock: bigint = 0n;
      try {
        toBlock = await publicClient.getBlockNumber();
      } catch (err) {
        console.error("[useHistoricalData] getBlockNumber failed", { error: err });
      }

      // Calculate safe fromBlock to prevent RPC range limit errors
      const MAX_BLOCK_RANGE = 29n;
      const configuredDeployBlock = deploymentInfo.deployBlock ? BigInt(deploymentInfo.deployBlock) : 0n;

      let fromBlock: bigint = 0n;
      if (configuredDeployBlock > 0n && toBlock > configuredDeployBlock && (toBlock - configuredDeployBlock) <= MAX_BLOCK_RANGE) {
        fromBlock = configuredDeployBlock;
      } else {
        fromBlock = toBlock > MAX_BLOCK_RANGE ? toBlock - MAX_BLOCK_RANGE : 0n;
      }

      // Fetch MockAPYUpdated events safely
      let logs: any[] = [];
      if (toBlock > 0n && CONTRACTS.yieldRouter?.address) {
        try {
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

      // Process events into historical data points using a Map for O(1) aggregation
      const historyMap = new Map<number, HistoricalAPYPoint>();
      const currentTimeSec = Math.floor(Date.now() / 1000);

      for (const log of logs) {
        if (!log || !log.args) continue;

        let timestamp = currentTimeSec;
        try {
          if (log.blockNumber) {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            if (block?.timestamp) timestamp = Number(block.timestamp);
          }
        } catch {
          // Fallback to current time if block query fails
        }

        let venue: number | undefined;
        let newAPY: bigint | undefined;

        try {
          venue = Number(log.args.venue);
          newAPY = log.args.newAPY ? BigInt(log.args.newAPY) : undefined;
        } catch (err) {
          continue;
        }

        if (isNaN(venue) || newAPY === undefined) continue;

        const roundedTimestamp = Math.floor(timestamp);
        const newAPYNumber = Number(formatUnits(newAPY, 18)) * 100;
        if (isNaN(newAPYNumber)) continue;

        let point = historyMap.get(roundedTimestamp);
        if (!point) {
          point = {
            timestamp: roundedTimestamp,
            kineticAPY: venue === 0 ? newAPYNumber : (isNaN(kineticAPY) ? 0 : kineticAPY),
            morphoAPY: venue === 1 ? newAPYNumber : (isNaN(morphoAPY) ? 0 : morphoAPY),
            bestAPY: 0
          };
        } else {
          if (venue === 0) {
            point.kineticAPY = newAPYNumber;
          } else {
            point.morphoAPY = newAPYNumber;
          }
        }

        point.bestAPY = Math.max(point.kineticAPY, point.morphoAPY);
        historyMap.set(roundedTimestamp, point);
      }

      const apyHistory: HistoricalAPYPoint[] = Array.from(historyMap.values());

      // Ensure recent point exists if gap is too large
      if (
        apyHistory.length === 0 ||
        Math.abs(apyHistory[apyHistory.length - 1].timestamp - currentTimeSec) > 300
      ) {
        apyHistory.push({
          timestamp: currentTimeSec,
          kineticAPY: isNaN(kineticAPY) ? 0 : kineticAPY,
          morphoAPY: isNaN(morphoAPY) ? 0 : morphoAPY,
          bestAPY: isNaN(bestAPY) ? 0 : bestAPY
        });
      }

      apyHistory.sort((a, b) => a.timestamp - b.timestamp);

      if (apyHistory.length > 168) {
        apyHistory.splice(0, apyHistory.length - 168);
      }

      const safeKinetic = !isNaN(kineticAPY) ? kineticAPY : 0;
      const safeMorpho = !isNaN(morphoAPY) ? morphoAPY : 0;
      const safeBest = !isNaN(bestAPY) ? bestAPY : 0;

      return {
        apyHistory,
        currentKineticAPY: safeKinetic,
        currentMorphoAPY: safeMorpho,
        currentBestAPY: safeBest
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
  if (isNaN(depositAmount) || isNaN(apy) || depositAmount <= 0 || apy <= 0) return 0;
  const principal = depositAmount;
  const rate = apy / 100;
  const n = compoundFrequency;
  const t = 1;

  const finalAmount = principal * Math.pow(1 + rate / n, n * t);
  return isNaN(finalAmount) ? 0 : finalAmount - principal;
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

    if (tierRange > 0n) {
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