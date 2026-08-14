// import { Award } from "lucide-react";
// import FlowLine from "./FlowLine";
// import type { ReputationTier } from "../data/mockData";

// interface ReputationBadgeProps {
//   tier: ReputationTier;
//   progressToNext: number;
//   nextTier: ReputationTier;
//   amountHeld: number;
//   daysHeld: number;
// }

// const TIER_COLOR: Record<ReputationTier, string> = {
//   None: "text-text-muted",
//   Bronze: "text-tier-bronze",
//   Silver: "text-tier-silver",
//   Gold: "text-tier-gold",
// };

// const TIER_BG: Record<ReputationTier, string> = {
//   None: "bg-bg-surface",
//   Bronze: "bg-tier-bronze/10",
//   Silver: "bg-tier-silver/10",
//   Gold: "bg-tier-gold/10",
// };

// /**
//  * Displays the user's on-chain reputation tier, computed from
//  * YieldRouter.getReputationTier() in Step 5. Reuses FlowLine as a progress
//  * bar toward the next tier.
//  */
// export default function ReputationBadge({
//   tier,
//   progressToNext,
//   nextTier,
//   amountHeld,
//   daysHeld,
// }: ReputationBadgeProps) {
//   return (
//     <div className="rounded-xl border border-border bg-bg-base p-6">
//       <div className="flex items-center justify-between">
//         <h3 className="font-display text-base font-bold">Reputation</h3>
//         <span
//           className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${TIER_BG[tier]} ${TIER_COLOR[tier]}`}
//         >
//           <Award className="h-4 w-4" aria-hidden />
//           {tier}
//         </span>
//       </div>

//       <div className="mt-5">
//         <FlowLine progress={progressToNext} showTierLabels />
//       </div>

//       {tier !== "Gold" ? (
//         <p className="mt-3 text-sm text-text-muted">
//           {progressToNext}% of the way to{" "}
//           <span className="font-medium text-text-primary">{nextTier}</span>
//         </p>
//       ) : (
//         <p className="mt-3 text-sm text-text-muted">
//           You've reached the highest tier
//         </p>
//       )}

//       <div className="mt-4 grid gap-4 sm:grid-cols-2 border-t border-border pt-4">
//         <div>
//           <p className="text-xs text-text-muted">Amount held</p>
//           <p className="num text-sm font-medium text-text-primary">
//             {amountHeld.toLocaleString(undefined, {
//               minimumFractionDigits: 2,
//               maximumFractionDigits: 2,
//             })}{" "}
//             FXRP
//           </p>
//         </div>
//         <div>
//           <p className="text-xs text-text-muted">Days held</p>
//           <p className="num text-sm font-medium text-text-primary">
//             {daysHeld}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

import type { ReactNode } from "react";
import { Award, AlertCircle } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import FlowLine from "./FlowLine";
import { CONTRACTS, isDeployed, tierNameFromIndex } from "../contracts";
import { coston2 } from "../wagmi";
import { describeContractError } from "../lib/errors";
import type { ReputationTierName } from "../contracts";

const TIER_COLOR: Record<ReputationTierName, string> = {
  None: "text-text-muted",
  Bronze: "text-tier-bronze",
  Silver: "text-tier-silver",
  Gold: "text-tier-gold",
};

const TIER_BG: Record<ReputationTierName, string> = {
  None: "bg-bg-surface",
  Bronze: "bg-tier-bronze/10",
  Silver: "bg-tier-silver/10",
  Gold: "bg-tier-gold/10",
};

const NEXT_TIER: Record<ReputationTierName, ReputationTierName | null> = {
  None: "Bronze",
  Bronze: "Silver",
  Silver: "Gold",
  Gold: null,
};

/**
 * Displays the user's on-chain reputation tier, read from
 * YieldRouter.getReputationTier(). The tier badge itself is always the
 * on-chain value (the source of truth); the progress bar toward the next
 * tier is computed client-side from the same amount * daysHeld formula the
 * contract uses (see YieldRouter.getReputationTier's NatSpec), using the
 * client clock as an approximation of block.timestamp.
 */
export default function ReputationBadge() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled = isDeployed && isConnected && onCorrectNetwork && !!address;

  const { data, isLoading, isError, error } = useReadContracts({
    allowFailure: false,
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

  return (
    <div className="rounded-xl border border-border bg-bg-base p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h3 className="font-display text-base font-bold">Reputation</h3>
          {/* Tooltip for Reputation explanation */}
          <div className="ml-2 inline-flex items-center justify-center w-4 h-4 text-xs bg-primary-blue/10 text-primary-blue rounded-full cursor-help" title="Your reputation score is based on how much FXRP you hold and for how long. Higher reputation unlocks better yields and benefits.">
            ?
          </div>
        </div>
        {enabled && data && (
          <TierPill tier={tierNameFromIndex(Number(data[0]))} />
        )}
      </div>

      {!isDeployed ? (
        <StatusNotice>
          Contracts aren't deployed yet — see the APY card above for setup
          steps.
        </StatusNotice>
      ) : !isConnected ? (
        <StatusNotice>Connect your wallet to see your tier.</StatusNotice>
      ) : !onCorrectNetwork ? (
        <StatusNotice>
          Switch your wallet to Flare Coston2 (chain ID 114) to see your
          tier.
        </StatusNotice>
      ) : isLoading ? (
        <div className="mt-5 space-y-3">
          <div className="h-2.5 w-full animate-pulse rounded-full bg-bg-surface" />
          <div className="h-4 w-40 animate-pulse rounded bg-bg-surface" />
        </div>
      ) : isError ? (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-danger-red">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden />
          {describeContractError(error)}
        </p>
      ) : (
        data && (
          <ReputationDetails
            data={
              data as unknown as [
                number | bigint,
                readonly [bigint, bigint],
                bigint,
                bigint,
                bigint
              ]
            }
          />
        )
      )}
    </div>
  );
}

function TierPill({ tier }: { tier: ReputationTierName }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${TIER_BG[tier]} ${TIER_COLOR[tier]}`}
    >
      <Award className="h-4 w-4" aria-hidden />
      {tier}
    </span>
  );
}

function ReputationDetails({
  data,
}: {
  data: readonly [
    number | bigint,
    readonly [bigint, bigint],
    bigint,
    bigint,
    bigint
  ];
}) {
  const [tierRaw, depositRecord, bronzeThreshold, silverThreshold, goldThreshold] =
    data;
  const tier = tierNameFromIndex(Number(tierRaw));
  const [amountRaw, timestampRaw] = depositRecord;

  const amountHeld = Number(formatUnits(amountRaw, 18));
  const daysHeld =
    timestampRaw > 0n
      ? Math.floor(Date.now() / 1000 - Number(timestampRaw)) / 86400
      : 0;
  const score = amountRaw * BigInt(Math.max(0, Math.floor(daysHeld)));

  const nextTier = NEXT_TIER[tier];
  const nextThreshold =
    nextTier === "Bronze"
      ? bronzeThreshold
      : nextTier === "Silver"
      ? silverThreshold
      : nextTier === "Gold"
      ? goldThreshold
      : null;

  const progressToNext =
    nextThreshold && nextThreshold > 0n
      ? Math.min(100, Number((score * 100n) / nextThreshold))
      : 100;

  return (
    <>
      <div className="mt-5">
        <FlowLine progress={progressToNext} showTierLabels />
      </div>

      {nextTier ? (
        <p className="mt-3 text-sm text-text-muted">
          {progressToNext}% of the way to{" "}
          <span className="font-medium text-text-primary">{nextTier}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          You've reached the highest tier
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 border-t border-border pt-4">
        <div className="relative">
          <p className="text-xs text-text-muted">Amount held</p>
          <p className="num text-sm font-medium text-text-primary">
            {amountHeld.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            FXRP
          </p>
          {/* Tooltip for Amount held */}
          <div className="absolute inline-flex items-center justify-center w-4 h-4 ml-1 -mt-0.5 text-xs bg-primary-blue/10 text-primary-blue rounded-full cursor-help" title="The total amount of FXRP you have deposited. Higher amounts lead to faster reputation growth.">
            ?
          </div>
        </div>
        <div className="relative">
          <p className="text-xs text-text-muted">Days held</p>
          <p className="num text-sm font-medium text-text-primary">
            {Math.floor(daysHeld)}
          </p>
          {/* Tooltip for Days held */}
          <div className="absolute inline-flex items-center justify-center w-4 h-4 ml-1 -mt-0.5 text-xs bg-primary-blue/10 text-primary-blue rounded-full cursor-help" title="How long your deposit has been held. Longer holding periods increase your reputation score.">
            ?
          </div>
        </div>
      </div>
    </>
  );
}

function StatusNotice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-lg bg-bg-surface p-3 text-sm text-text-muted">
      {children}
    </p>
  );
}