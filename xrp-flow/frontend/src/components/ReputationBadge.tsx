

// import type { ReactNode } from "react";
// import { Award, AlertCircle } from "lucide-react";
// import { formatUnits } from "viem";
// import { useAccount, useChainId, useReadContracts, useState } from "wagmi";
// import FlowLine from "./FlowLine";
// import { CONTRACTS, isDeployed, tierNameFromIndex } from "../contracts";
// import { coston2 } from "../wagmi";
// import { describeContractError } from "../lib/errors";
// import type { ReputationTierName } from "../contracts";

// const TIER_COLOR: Record<ReputationTierName, string> = {
//   None: "text-text-muted",
//   Bronze: "text-tier-bronze",
//   Silver: "text-tier-silver",
//   Gold: "text-tier-gold",
// };

// const TIER_BG: Record<ReputationTierName, string> = {
//   None: "bg-bg-surface",
//   Bronze: "bg-tier-bronze/10",
//   Silver: "bg-tier-silver/10",
//   Gold: "bg-tier-gold/10",
// };

// const NEXT_TIER: Record<ReputationTierName, ReputationTierName | null> = {
//   None: "Bronze",
//   Bronze: "Silver",
//   Silver: "Gold",
//   Gold: null,
// };

// /**
//  * Displays the user's on-chain reputation tier, read from
//  * YieldRouter.getReputationTier(). The tier badge itself is always the
//  * on-chain value (the source of truth); the progress bar toward the next
//  * tier is computed client-side from the same amount * daysHeld formula the
//  * contract uses (see YieldRouter.getReputationTier's NatSpec), using the
//  * client clock as an approximation of block.timestamp.
//  */
// export default function ReputationBadge() {
//   const chainId = useChainId();
//   const { address, isConnected } = useAccount();
//   const onCorrectNetwork = chainId === coston2.id;
//   const enabled = isDeployed && isConnected && onCorrectNetwork && !!address;

//   const { data, isLoading, isError, error } = useReadContracts({
//     allowFailure: false,
//     contracts: [
//       {
//         ...CONTRACTS.yieldRouter,
//         functionName: "getReputationTier",
//         args: address ? [address] : undefined,
//       },
//       {
//         ...CONTRACTS.yieldRouter,
//         functionName: "deposits",
//         args: address ? [address] : undefined,
//       },
//       { ...CONTRACTS.yieldRouter, functionName: "bronzeThreshold" },
//       { ...CONTRACTS.yieldRouter, functionName: "silverThreshold" },
//       { ...CONTRACTS.yieldRouter, functionName: "goldThreshold" },
//     ],
//     query: { enabled },
//   });

//   return (
//     <div className="rounded-xl border border-border bg-bg-base p-6">
//       <div className="flex items-center justify-between">
//         <div className="flex items-center">
//           <h3 className="font-display text-base font-bold">Reputation</h3>
//           {/* Tooltip for Reputation explanation */}
//           <div className="ml-2 inline-flex items-center justify-center w-4 h-4 text-xs bg-primary-blue/10 text-primary-blue rounded-full cursor-help" title="Your reputation score is based on how much FXRP you hold and for how long. Higher reputation unlocks better yields and benefits.">
//             ?
//           </div>
//         </div>
//         {enabled && data && (
//           <TierPill tier={tierNameFromIndex(Number(data[0]))} />
//         )}
//       </div>

//       {!isDeployed ? (
//         <StatusNotice>
//           Contracts aren't deployed yet — see the APY card above for setup
//           steps.
//         </StatusNotice>
//       ) : !isConnected ? (
//         <StatusNotice>Connect your wallet to see your tier.</StatusNotice>
//       ) : !onCorrectNetwork ? (
//         <StatusNotice>
//           Switch your wallet to Flare Coston2 (chain ID 114) to see your
//           tier.
//         </StatusNotice>
//       ) : isLoading ? (
//         <div className="mt-5 space-y-3">
//           <div className="h-2.5 w-full animate-pulse rounded-full bg-bg-surface" />
//           <div className="h-4 w-40 animate-pulse rounded bg-bg-surface" />
//         </div>
//       ) : isError ? (
//         <p className="mt-4 flex items-center gap-1.5 text-sm text-danger-red">
//           <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden />
//           {describeContractError(error)}
//         </p>
//       ) : (
//         data && (
//           <ReputationDetails
//             data={
//               data as unknown as [
//                 number | bigint,
//                 readonly [bigint, bigint],
//                 bigint,
//                 bigint,
//                 bigint
//               ]
//             }
//           />
//         )
//       )}
//     </div>
//   );
// }

// function TierPill({ tier }: { tier: ReputationTierName }) {
//   return (
//     <span
//       className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${TIER_BG[tier]} ${TIER_COLOR[tier]}`}
//     >
//       <Award className="h-4 w-4" aria-hidden />
//       {tier}
//     </span>
//   );
// }

// function ReputationDetails({
//   data,
// }: {
//   data: readonly [
//     number | bigint,
//     readonly [bigint, bigint],
//     bigint,
//     bigint,
//     bigint
//   ];
// }) {
//   const [tierRaw, depositRecord, bronzeThreshold, silverThreshold, goldThreshold] =
//     data;
//   const tier = tierNameFromIndex(Number(tierRaw));
//   const [amountRaw, timestampRaw] = depositRecord;

//   const amountHeld = Number(formatUnits(amountRaw, 18));
//   const daysHeld =
//     timestampRaw > 0n
//       ? Math.floor(Date.now() / 1000 - Number(timestampRaw)) / 86400
//       : 0;
//   const score = amountRaw * BigInt(Math.max(0, Math.floor(daysHeld)));

//   const nextTier = NEXT_TIER[tier];
//   const nextThreshold =
//     nextTier === "Bronze"
//       ? bronzeThreshold
//       : nextTier === "Silver"
//       ? silverThreshold
//       : nextTier === "Gold"
//       ? goldThreshold
//       : null;

//   const progressToNext =
//     nextThreshold && nextThreshold > 0n
//       ? Math.min(100, Number((score * 100n) / nextThreshold))
//       : 100;

//   // Calculate remaining FXRP-days needed for next tier
//   const remainingScore =
//     nextThreshold && nextThreshold > 0n ? nextThreshold - score : 0n;
//   const remainingFXRPDays = Number(formatUnits(remainingScore, 18)); // Convert to FXRP-days

//   // State for toggling educational content
//   const [showDetails, setShowDetails] = useState(false);

//   return (
//     <>
//       <div className="mt-5">
//         <FlowLine progress={progressToNext} showTierLabels />
//       </div>

//       {nextTier ? (
//         <p className="mt-3 text-sm text-text-muted">
//           You're {progressToNext}% to {nextTier} tier (
//           <span className="font-medium text-text-primary">
//             {remainingFXRPDays.toFixed(1)} more FXRP-days needed
//           </span>
//           )
//         </p>
//       ) : (
//         <p className="mt-3 text-sm text-text-muted">
//           You've reached the highest tier
//         </p>
//       )}

//       {/* Educational expandable section */}
//       <div className="mt-6">
//         <button
//           onClick={() => setShowDetails(!showDetails)}
//           className="flex items-center justify-between w-full text-left text-sm font-medium text-text-primary hover:text-text-primary/80"
//         >
//           <span>How Reputation Works</span>
//           <span className="ml-2 h-3 w-3 inline-flex items-center justify-center transition-transform duration-200">
//             {/* Rotate chevron when expanded */}
//             <svg
//               className={`h-2 w-2 ${showDetails ? "rotate-180" : ""}`}
//               viewBox="0 0 20 20"
//               fill="none"
//               stroke="currentColor"
//             >
//               <path d="M6 8l4 4 4-4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
//             </svg>
//           </span>
//         </button>
//         {showDetails && (
//           <div className="mt-4 space-y-3 text-sm text-text-muted">
//             <div className="flex items-start">
//               <div className="flex-shrink-0">
//                 <div className="h-3 w-3 rounded-t-md bg-primary-blue/10 flex items-center justify-center text-xs font-medium text-primary-blue">
//                   ?
//                 </div>
//               </div>
//               <div className="ml-3">
//                 <p className="font-medium">Formula</p>
//                 <p className="mt-1">Reputation Score = Amount Held (FXRP) × Days Held</p>
//                 <p className="mt-1">
//                   Example: Holding 100 FXRP for 30 days = 3,000 reputation score
//                 </p>
//               </div>
//             </div>
//             <div className="flex items-start">
//               <div className="flex-shrink-0">
//                 <div className="h-3 w-3 rounded-t-md bg-primary-blue/10 flex items-center justify-center text-xs font-medium text-primary-blue">
//                   ?
//                 </div>
//               </div>
//               <div className="ml-3">
//                 <p className="font-medium">Tier Thresholds</p>
//                 <p className="mt-1">
//                   Bronze: {Number(formatUnits(bronzeThreshold, 18)).toLocaleString()} FXRP-days{" "}
//                   <span className="font-medium">{tierNameFromIndex(Number(tierRaw)) >= 1 ? "✓" : ""}</span>
//                 </p>
//                 <p className="mt-1">
//                   Silver: {Number(formatUnits(silverThreshold, 18)).toLocaleString()} FXRP-days{" "}
//                   <span className="font-medium">{tierNameFromIndex(Number(tierRaw)) >= 2 ? "✓" : ""}</span>
//                 </p>
//                 <p className="mt-1">
//                   Gold: {Number(formatUnits(goldThreshold, 18)).toLocaleString()} FXRP-days{" "}
//                   <span className="font-medium">{tierNameFromIndex(Number(tierRaw)) >= 3 ? "✓" : ""}</span>
//                 </p>
//               </div>
//             </div>
//             <div className="flex items-start">
//               <div className="flex-shrink-0">
//                 <div className="h-3 w-3 rounded-t-md bg-primary-blue/10 flex items-center justify-center text-xs font-medium text-primary-blue">
//                   ?
//                 </div>
//               </div>
//               <div className="ml-3">
//                 <p className="font-medium">Important Notes</p>
//                 <p className="mt-1">
//                   • Top-ups don't reset your reputation clock - we use a weighted average
//                   <br className="hidden sm:inline" />
//                   • Your score updates continuously as time passes
//                   <br className="hidden sm:inline" />
//                   • Higher tiers unlock better yield boosts
//                 </p>
//               </div>
//             </div>
//           </div>
//         )}

//       <div className="mt-4 grid gap-4 sm:grid-cols-2 border-t border-border pt-4">
//         <div className="relative">
//           <p className="text-xs text-text-muted">Amount held</p>
//           <p className="num text-sm font-medium text-text-primary">
//             {amountHeld.toLocaleString(undefined, {
//               minimumFractionDigits: 2,
//               maximumFractionDigits: 2,
//             })}{" "}
//             FXRP
//           </p>
//           {/* Tooltip for Amount held */}
//           <div className="absolute inline-flex items-center justify-center w-4 h-4 ml-1 -mt-0.5 text-xs bg-primary-blue/10 text-primary-blue rounded-full cursor-help" title="The total amount of FXRP you have deposited. Higher amounts lead to faster reputation growth.">
//             ?
//           </div>
//         </div>
//         <div className="relative">
//           <p className="text-xs text-text-muted">Days held</p>
//           <p className="num text-sm font-medium text-text-primary">
//             {Math.floor(daysHeld)}
//           </p>
//           {/* Tooltip for Days held */}
//           <div className="absolute inline-flex items-center justify-center w-4 h-4 ml-1 -mt-0.5 text-xs bg-primary-blue/10 text-primary-blue rounded-full cursor-help" title="How long your deposit has been held. Longer holding periods increase your reputation score.">
//             ?
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// function StatusNotice({ children }: { children: ReactNode }) {
//   return (
//     <p className="mt-4 rounded-lg bg-bg-surface p-3 text-sm text-text-muted">
//       {children}
//     </p>
//   );
// }

import { useEffect, useState } from "react";
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

type WagmiContractResult<T> = {
  result: T;
  status: "success" | "failure";
  error?: Error;
};

type ReputationDataArray = readonly [
  WagmiContractResult<number | bigint>,
  WagmiContractResult<readonly [bigint, bigint]>,
  WagmiContractResult<bigint>,
  WagmiContractResult<bigint>,
  WagmiContractResult<bigint>
];

/**
 * Displays the user's on-chain reputation tier, read from
 * YieldRouter.getReputationTier().
 */
export default function ReputationBadge() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled = isDeployed && isConnected && onCorrectNetwork && !!address;

  // Note: Removed allowFailure: false to align with standard Wagmi v2 object returns
  const { data, isLoading, isError, error } = useReadContracts({
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

  // Verify we have valid data before trying to access .result properties
  const hasValidData = data && data[0]?.status === "success";

  return (
    <div className="rounded-xl border border-border bg-bg-base p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-bold">Reputation</h3>
          <div
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-primary-blue/10 text-xs text-primary-blue"
            title="Your reputation score is based on how much FXRP you hold and for how long. Higher reputation unlocks better yields and benefits."
          >
            ?
          </div>
        </div>
        {enabled && hasValidData && (
          <TierPill tier={tierNameFromIndex(Number(data[0].result))} />
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
          Switch your wallet to Flare Coston2 (chain ID 114) to see your tier.
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
        hasValidData && <ReputationDetails data={data as ReputationDataArray} />
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

function ReputationDetails({ data }: { data: ReputationDataArray }) {
  const [showDetails, setShowDetails] = useState(false);
  const [clientTime, setClientTime] = useState<number | null>(null);

  // Hydration safety: calculate time on the client to avoid SSR mismatches
  useEffect(() => {
    setClientTime(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => {
      setClientTime(Math.floor(Date.now() / 1000));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Safely extract Wagmi v2 results
  const tierRaw = data[0].result;
  const depositRecord = data[1].result;
  const bronzeThreshold = data[2].result;
  const silverThreshold = data[3].result;
  const goldThreshold = data[4].result;

  const tier = tierNameFromIndex(Number(tierRaw));
  const [amountRaw, timestampRaw] = depositRecord;

  const amountHeld = Number(formatUnits(amountRaw, 18));
  
  // Wait for client mount to calculate duration to avoid hydration flash
  const daysHeld =
    timestampRaw > 0n && clientTime !== null
      ? Math.max(0, clientTime - Number(timestampRaw)) / 86400
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

  const remainingScore =
    nextThreshold && nextThreshold > 0n ? nextThreshold - score : 0n;
  const remainingFXRPDays = Number(formatUnits(remainingScore, 18));

  return (
    <>
      <div className="mt-5">
        <FlowLine progress={progressToNext} showTierLabels />
      </div>

      {nextTier ? (
        <p className="mt-3 text-sm text-text-muted">
          You're {progressToNext}% to {nextTier} tier (
          <span className="font-medium text-text-primary">
            {remainingFXRPDays.toFixed(1)} more FXRP-days needed
          </span>
          )
        </p>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          You've reached the highest tier
        </p>
      )}

      {/* Educational expandable section */}
      <div className="mt-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-text-primary hover:text-text-primary/80"
        >
          <span>How Reputation Works</span>
          <span className="ml-2 inline-flex h-3 w-3 items-center justify-center transition-transform duration-200">
            <svg
              className={`h-2 w-2 ${showDetails ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M6 8l4 4 4-4"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        {showDetails && (
          <div className="mt-4 space-y-3 text-sm text-text-muted">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex h-3 w-3 items-center justify-center rounded-t-md bg-primary-blue/10 text-xs font-medium text-primary-blue">
                  ?
                </div>
              </div>
              <div className="ml-3">
                <p className="font-medium">Formula</p>
                <p className="mt-1">
                  Reputation Score = Amount Held (FXRP) × Days Held
                </p>
                <p className="mt-1">
                  Example: Holding 100 FXRP for 30 days = 3,000 reputation score
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex h-3 w-3 items-center justify-center rounded-t-md bg-primary-blue/10 text-xs font-medium text-primary-blue">
                  ?
                </div>
              </div>
              <div className="ml-3">
                <p className="font-medium">Tier Thresholds</p>
                <p className="mt-1">
                  Bronze:{" "}
                  {Number(formatUnits(bronzeThreshold, 18)).toLocaleString()}{" "}
                  FXRP-days{" "}
                  <span className="font-medium">
                    {Number(tierRaw) >= 1 ? "✓" : ""}
                  </span>
                </p>
                <p className="mt-1">
                  Silver:{" "}
                  {Number(formatUnits(silverThreshold, 18)).toLocaleString()}{" "}
                  FXRP-days{" "}
                  <span className="font-medium">
                    {Number(tierRaw) >= 2 ? "✓" : ""}
                  </span>
                </p>
                <p className="mt-1">
                  Gold:{" "}
                  {Number(formatUnits(goldThreshold, 18)).toLocaleString()}{" "}
                  FXRP-days{" "}
                  <span className="font-medium">
                    {Number(tierRaw) >= 3 ? "✓" : ""}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex h-3 w-3 items-center justify-center rounded-t-md bg-primary-blue/10 text-xs font-medium text-primary-blue">
                  ?
                </div>
              </div>
              <div className="ml-3">
                <p className="font-medium">Important Notes</p>
                <p className="mt-1">
                  • Top-ups don't reset your reputation clock - we use a
                  weighted average
                  <br className="hidden sm:inline" />
                  • Your score updates continuously as time passes
                  <br className="hidden sm:inline" />
                  • Higher tiers unlock better yield boosts
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <p className="text-xs text-text-muted">Amount held</p>
            <div
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-primary-blue/10 text-xs text-primary-blue"
              title="The total amount of FXRP you have deposited. Higher amounts lead to faster reputation growth."
            >
              ?
            </div>
          </div>
          <p className="num text-sm font-medium text-text-primary">
            {amountHeld.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            FXRP
          </p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <p className="text-xs text-text-muted">Days held</p>
            <div
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-primary-blue/10 text-xs text-primary-blue"
              title="How long your deposit has been held. Longer holding periods increase your reputation score."
            >
              ?
            </div>
          </div>
          <p className="num text-sm font-medium text-text-primary">
            {Math.floor(daysHeld)}
          </p>
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