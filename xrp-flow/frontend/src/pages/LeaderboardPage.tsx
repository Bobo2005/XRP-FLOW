
import { useEffect, useState } from "react";
import { useAccount, useChainId, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, isDeployed } from "../contracts";
import { coston2 } from "../wagmi";
import { describeContractError } from "../lib/errors";

interface LeaderboardEntry {
  user: `0x${string}`;
  score: bigint;
  tier: number; // 0: None, 1: Bronze, 2: Silver, 3: Gold
}

const TIER_NAMES = ["None", "Bronze", "Silver", "Gold"];
const TIER_COLORS = [
  "text-text-muted",
  "text-tier-bronze",
  "text-tier-silver",
  "text-tier-gold",
];
const TIER_BGS = [
  "bg-bg-surface",
  "bg-tier-bronze/10",
  "bg-tier-silver/10",
  "bg-tier-gold/10",
];

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled = isDeployed && isConnected && onCorrectNetwork && !!address;

  // Fix 1: SSR Hydration Safety — capture timestamp on mount
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
  }, []);

  // Fetch token decimals dynamically
  const { data: decimalsData } = useReadContract({
    ...CONTRACTS.fxrp,
    functionName: "decimals",
    query: { enabled },
  });
  const decimals = decimalsData ? Number(decimalsData) : 18;

  // Fix 2: Replaced window.contract imperative fetch with reactive useReadContract
  // const {
  //   data: leaderboardRaw,
  //   isLoading: leaderboardLoading,
  //   error: leaderboardError,
  // } = useReadContract({
  //   ...CONTRACTS.yieldRouter,
  //   functionName: "getTopUsersByReputation",
  //   args: [10n],
  //   query: { enabled },
  // });

  const {
    data: leaderboardRaw,
    isLoading: leaderboardLoading,
  } = useReadContract({
    ...CONTRACTS.yieldRouter,
    functionName: "getTopUsersByReputation",
    args: [BigInt(10)],
    query: { 
      enabled,
      // Prevents spamming RPC retries if the contract reverts due to empty state
      retry: false, 
    },
  });

  // Batch query user reputation & tier thresholds
  const {
    data: reputationData,
    isLoading: reputationLoading,
    error: reputationError,
  } = useReadContracts({
    contracts: [
      {
        ...CONTRACTS.yieldRouter,
        functionName: "getReputationTier",
        args: address ? [address] : undefined,
      },
      {
        ...CONTRACTS.yieldRouter,
        functionName: "deposits",
        args: address ? [address] : undefined,
      },
      { ...CONTRACTS.yieldRouter, functionName: "bronzeThreshold" },
      { ...CONTRACTS.yieldRouter, functionName: "silverThreshold" },
      { ...CONTRACTS.yieldRouter, functionName: "goldThreshold" },
    ],
    query: { enabled },
  });

  const loading = leaderboardLoading || reputationLoading;
  // Prevent leaderboard RPC errors from blocking the entire page UI
  const rawError = reputationError;
  const error = rawError ? describeContractError(rawError) : null;

  if (!isDeployed) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">
          Contracts aren't deployed yet — see the APY card above for setup
          steps.
        </p>
      </div>
    );
  }
  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">Connect your wallet to see the leaderboard.</p>
      </div>
    );
  }
  if (!onCorrectNetwork) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">
          Switch your wallet to Flare Coston2 (chain ID 114) to see the
          leaderboard.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="h-5 w-5 animate-pulse rounded-full bg-bg-surface mx-auto mb-4" />
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger-red">{error}</p>
      </div>
    );
  }

  // Calculate user's reputation score and tier
  let userTierRaw = 0;
  let userScore = 0n;
  let userAmountHeld = 0;
  let userDaysHeld = 0;
  let userNextTier = "";
  let userProgressToNext = 0;
  let userRemainingFXRPDays = 0;

  // Safe Wagmi v2 array result extraction (.result property check)
  if (reputationData) {
    const tierRaw = reputationData[0]?.result as bigint | number | undefined;
    const depositRecord = reputationData[1]?.result as readonly [bigint, bigint] | undefined;
    const bronzeThreshold = reputationData[2]?.result as bigint | undefined;
    const silverThreshold = reputationData[3]?.result as bigint | undefined;
    const goldThreshold = reputationData[4]?.result as bigint | undefined;

    if (tierRaw !== undefined) {
      userTierRaw = Number(tierRaw);
    }

    if (depositRecord) {
      const [amountRaw, timestampRaw] = depositRecord;
      userAmountHeld = Number(formatUnits(amountRaw, decimals));

      if (now && timestampRaw > 0n) {
        userDaysHeld = Math.max(0, (now - Number(timestampRaw)) / 86400);
      }

      userScore = amountRaw * BigInt(Math.max(0, Math.floor(userDaysHeld)));

      const nextTier = TIER_NAMES[userTierRaw + 1] || null;
      const nextThreshold =
        nextTier === "Bronze"
          ? bronzeThreshold
          : nextTier === "Silver"
          ? silverThreshold
          : nextTier === "Gold"
          ? goldThreshold
          : null;

      if (nextThreshold && nextThreshold > 0n) {
        userProgressToNext = Math.min(100, Number((userScore * 100n) / nextThreshold));
        const remainingScore = nextThreshold > userScore ? nextThreshold - userScore : 0n;
        userRemainingFXRPDays = Number(formatUnits(remainingScore, decimals));
      } else {
        userProgressToNext = 100;
        userRemainingFXRPDays = 0;
      }
      userNextTier = nextTier || "";
    }
  }

  // Map raw contract response to LeaderboardEntry array safely
  let leaderboard: LeaderboardEntry[] = Array.isArray(leaderboardRaw)
    ? (leaderboardRaw as any[]).map((entry: any) => ({
        user: entry.user ?? entry[0],
        score: BigInt(entry.score ?? entry[1] ?? 0n),
        tier: Number(entry.tier ?? entry[2] ?? 0),
      }))
    : [];

  // Dynamically ensure user position appears if active
  if (address && userAmountHeld > 0) {
    const userExists = leaderboard.some(
      (e) => e.user?.toLowerCase() === address.toLowerCase()
    );
    if (!userExists) {
      leaderboard.push({
        user: address as `0x${string}`,
        score: userScore,
        tier: userTierRaw,
      });
      leaderboard.sort((a, b) => (b.score > a.score ? 1 : b.score < a.score ? -1 : 0));
    }
  }

  return (
    <div className="space-y-6">
      {/* User's Reputation Section */}
      <div className="rounded-xl border border-border bg-bg-base p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">Your Reputation</h3>
          <p className="text-xs text-text-muted">
            {userAmountHeld.toLocaleString()} FXRP • {userDaysHeld.toFixed(1)} days
          </p>
        </div>

        <div className="mt-4">
          <div className="mb-3">
            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${TIER_BGS[userTierRaw]} ${TIER_COLORS[userTierRaw]}`}
              >
                {TIER_NAMES[userTierRaw]}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <div className="w-full bg-bg-surface/50 rounded-md h-2.5">
              <div
                className="h-full bg-primary-blue transition-all duration-500 ease-in-out rounded-md"
                style={{ width: `${userProgressToNext}%` }}
              />
            </div>
          </div>

          {userNextTier ? (
            <p className="mt-3 text-sm text-text-muted">
              You're {userProgressToNext}% to {userNextTier} tier (
              <span className="font-medium text-text-primary">
                {userRemainingFXRPDays.toFixed(1)} more FXRP-days needed
              </span>
              )
            </p>
          ) : (
            <p className="mt-3 text-sm text-text-muted">
              You've reached the highest tier
            </p>
          )}

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => alert("Shareable achievement card feature coming soon!")}
              className="w-full px-4 py-2 bg-primary-blue/10 text-primary-blue rounded-md hover:bg-primary-blue/20 transition-colors"
            >
              Share Achievement
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Leaderboard</h2>
        <p className="text-sm text-text-muted">
          Top 10 users by reputation score
        </p>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-center py-8 text-text-muted">
          No data available yet. Start earning reputation to appear on the
          leaderboard!
        </p>
      ) : (
        <div className="divide-y divide-border">
          {leaderboard.map((entry, index) => (
            <div key={entry.user} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <span
                      className={`text-xs font-bold rounded-full px-2 py-0.5 ${TIER_BGS[entry.tier]} ${TIER_COLORS[entry.tier]}`}
                    >
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {entry.user.slice(0, 6)}...{entry.user.slice(-4)}
                    </p>
                    <p className="text-xs text-text-muted">
                      Tier: {TIER_NAMES[entry.tier]}
                    </p>
                  </div>
                </div>

                {/* Single right-aligned metric column */}
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">
                    {Number(formatUnits(entry.score, decimals)).toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">FXRP-days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}