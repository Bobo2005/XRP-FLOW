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
        // Return empty data if no public client
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
        // Ensure we have a valid tuple result
        kineticRaw = Array.isArray(kineticResult) && kineticResult.length > 0 ? kineticResult[0] : 0n;
      } catch (err) {
        console.error("[useHistoricalData] readContract kineticMockAPY failed", { error: err });
        // Keep default value
      }

      try {
        const morphoResultTuple = await publicClient.readContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "morphoMockAPY"
        });
        // Ensure we have a valid tuple result
        morphoResult = Array.isArray(morphoResultTuple) && morphoResultTuple.length > 0 ? morphoResultTuple[0] : 0n;
      } catch (err) {
        console.error("[useHistoricalData] readContract morphoMockAPY failed", { error: err });
        // Keep default value
      }

      const kineticAPY = Number(formatUnits(kineticRaw, 18)) * 100;
      const morphoAPY = Number(formatUnits(morphoResult, 18)) * 100;
      const bestAPY = Math.max(kineticAPY, morphoAPY);

      // Get MockAPYUpdated events to build historical data
      const fromBlock = deploymentInfo.deployBlock != null
        ? BigInt(deploymentInfo.deployBlock)
        : 0n;

      let toBlock: bigint;
      try {
        toBlock = await publicClient.getBlockNumber();
      } catch (err) {
        console.error("[useHistoricalData] getBlockNumber failed", { error: err });
        // Fall back to current block if we can't get block number
        toBlock = fromBlock;
      }

      // Get MockAPYUpdated events
      let logs: any[] = [];
      try {
        const events = await publicClient.getContractEvents({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          eventName: "MockAPYUpdated",
          fromBlock,
          toBlock
        });
        // Ensure logs is always an array
        logs = Array.isArray(events) ? events : [];
      } catch (err) {
        console.error("[useHistoricalData] getContractEvents failed", { error: err });
        // Continue with empty logs array
        logs = [];
      }

      // Process events into historical data points
      const apyHistory: HistoricalAPYPoint[] = [];

      // Process each event
      for (const log of logs) {
        // Safety check: ensure log has the expected structure
        if (!log || !log.args) {
          console.warn("[useHistoricalData] Skipping log with missing args", { log });
          continue;
        }

        const timestamp = log.blockNumber ?
          await publicClient.getBlock({ blockNumber: log.blockNumber })
            .then(block => Number(block.timestamp)) : Date.now() / 1000;

        // Safely extract venue and newAPY from event args
        let venue: number | undefined;
        let newAPY: bigint | undefined;

        try {
          venue = Number(log.args.venue);
          newAPY = log.args.newAPY;
        } catch (err) {
          console.error("[useHistoricalData] Failed to parse event args", { error: err, log });
          continue;
        }

        // Validate extracted values
        if (isNaN(venue) || !newAPY) {
          console.warn("[useHistoricalData] Skipping log with invalid args", { venue, newAPY, log });
          continue;
        }

        // Convert newAPY to number ( venue is 0 = Kinetic, 1 = Morpho)
        const newAPYNumber = Number(formatUnits(newAPY, 18)) * 100;

        // Create or update historical point
        let existingPoint = apyHistory.find(point =>
          Math.abs(point.timestamp - timestamp) < 1); // Within 1 second

        if (!existingPoint) {
          existingPoint = {
            timestamp: Math.floor(timestamp),
            kineticAPY: venue === 0 ? newAPYNumber : kineticAPY, // If updating Kinetic, use new value; otherwise keep current
            morphoAPY: venue === 1 ? newAPYNumber : morphoAPY,   // If updating Morpho, use new value; otherwise keep current
            bestAPY: 0
          };
          apyHistory.push(existingPoint);
        } else {
          // Update existing point
          if (venue === 0) {
            existingPoint.kineticAPY = newAPYNumber;
          } else {
            existingPoint.morphoAPY = newAPYNumber;
          }
        }

        // Recalculate best APY
        existingPoint.bestAPY = Math.max(existingPoint.kineticAPY, existingPoint.morphoAPY);
      }

      // Add current values as the most recent point if we don't have recent data
      const now = Date.now() / 1000;
      if (apyHistory.length === 0 ||
          Math.abs(apyHistory[apyHistory.length - 1].timestamp - now) > 300) { // More than 5 minutes old
        apyHistory.push({
          timestamp: Math.floor(now),
          kineticAPY,
          morphoAPY,
          bestAPY
        });
      }

      // Sort by timestamp (oldest first)
      apyHistory.sort((a, b) => a.timestamp - b.timestamp);

      // Limit to last 168 points (1 week of hourly data) to prevent too much data
      if (apyHistory.length > 168) {
        apyHistory.splice(0, apyHistory.length - 168);
      }

      // Ensure we always return a valid structure
      return {
        apyHistory: Array.isArray(apyHistory) ? apyHistory : [],
        currentKineticAPY: (typeof kineticAPY === 'number' && !isNaN(kineticAPY)) ? kineticAPY : 0,
        currentMorphoAPY: (typeof morphoAPY === 'number' && !isNaN(morphoAPY)) ? morphoAPY : 0,
        currentBestAPY: (typeof bestAPY === 'number' && !isNaN(bestAPY)) ? bestAPY : 0
      };
    },
    // Refetch every 5 minutes to keep data fresh
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Calculate projected yield based on current APY and deposit amount
 */
export function calculateProjectedYield(
  depositAmount: number,
  apy: number,
  compoundFrequency: number = 365 // daily compounding
): number {
  // Formula: A = P(1 + r/n)^(nt)
  // Where:
  // A = final amount
  // P = principal (depositAmount)
  // r = annual interest rate (apy as decimal)
  // n = compound frequency per year
  // t = time in years (1 year for annual projection)

  const principal = depositAmount;
  const rate = apy / 100; // Convert percentage to decimal
  const n = compoundFrequency;
  const t = 1; // 1 year

  const finalAmount = principal * Math.pow(1 + rate / n, n * t);
  const yieldAmount = finalAmount - principal;

  return yieldAmount;
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
  currentTier: number; // 0=None, 1=Bronze, 2=Silver, 3=Gold
  progressToNext: number; // 0-100 percentage
  nextTierThreshold: bigint;
  nextTierName: string;
} {
  let currentTier = 0; // None
  let nextTierThreshold = bronzeThreshold;
  let nextTierName = "Bronze";

  if (currentScore >= goldThreshold) {
    currentTier = 3; // Gold
    nextTierThreshold = goldThreshold; // Already at max
    nextTierName = "Max Tier";
  } else if (currentScore >= silverThreshold) {
    currentTier = 2; // Silver
    nextTierThreshold = goldThreshold;
    nextTierName = "Gold";
  } else if (currentScore >= bronzeThreshold) {
    currentTier = 1; // Bronze
    nextTierThreshold = silverThreshold;
    nextTierName = "Silver";
  } else {
    currentTier = 0; // None
    nextTierThreshold = bronzeThreshold;
    nextTierName = "Bronze";
  }

  // Calculate progress to next tier
  let progressToNext = 0;
  if (currentTier < 3) { // Not at max tier
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
    // At max tier, show 100% progress
    progressToNext = 100;
  }

  return {
    currentTier,
    progressToNext,
    nextTierThreshold,
    nextTierName
  };
}