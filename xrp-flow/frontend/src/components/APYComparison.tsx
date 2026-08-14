
import type { ReactNode } from "react";
import { TrendingUp, AlertCircle } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import { CONTRACTS, isDeployed } from "../contracts";
import { coston2 } from "../wagmi";
import { describeContractError } from "../lib/errors";

/**
 * Compares FXRP supply APY across venues. Both rates read live from
 * YieldRouter (kineticMockAPY()/morphoMockAPY()) — "live" meaning
 * "whatever the owner last set via setMockAPY()", not a real Kinetic or
 * Morpho rate. Neither protocol has a confirmed Coston2 deployment yet
 * (see README.md), so YieldRouter routes deposits to MockKinetic/
 * MockMorpho. The routing logic itself is real and tested; the venues
 * behind it aren't.
 */
export default function APYComparison() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled = isDeployed && isConnected && onCorrectNetwork;

  const { data, isLoading, isError, error } = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...CONTRACTS.yieldRouter, functionName: "kineticMockAPY" },
      { ...CONTRACTS.yieldRouter, functionName: "morphoMockAPY" },
    ],
    query: { enabled },
  });

  const [kineticRaw, morphoRaw] = (data ?? []) as [bigint, bigint] | [];
  const kineticApy =
    kineticRaw !== undefined ? Number(formatUnits(kineticRaw, 18)) * 100 : undefined;
  const morphoApy =
    morphoRaw !== undefined ? Number(formatUnits(morphoRaw, 18)) * 100 : undefined;

  // Mirrors YieldRouter.getBestVenue()'s own tie-break: ties go to Kinetic.
  const morphoIsBest =
    morphoApy !== undefined && kineticApy !== undefined && morphoApy > kineticApy;

  return (
    <div className="rounded-xl border border-border bg-bg-base p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold">APY Comparison</h3>
        <TrendingUp className="h-4 w-4 text-text-muted" aria-hidden />
      </div>

      {!isDeployed ? (
        <StatusNotice>
          Contracts aren't deployed yet. Run{" "}
          <code className="num rounded bg-bg-surface px-1 py-0.5">
            npm run deploy:coston2
          </code>{" "}
          and copy the result into{" "}
          <code className="num rounded bg-bg-surface px-1 py-0.5">
            frontend/src/deployed-addresses.json
          </code>
          .
        </StatusNotice>
      ) : !isConnected ? (
        <StatusNotice>Connect your wallet to see live rates.</StatusNotice>
      ) : !onCorrectNetwork ? (
        <StatusNotice>
          Switch your wallet to Flare Coston2 (chain ID 114) to see live
          rates.
        </StatusNotice>
      ) : isLoading ? (
        <div className="mt-4 space-y-3">
          <div className="h-14 animate-pulse rounded-lg bg-bg-surface" />
          <div className="h-14 animate-pulse rounded-lg bg-bg-surface" />
        </div>
      ) : isError ? (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-danger-red">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden />
          {describeContractError(error)}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          <VenueRow
            name="Kinetic"
            apy={kineticApy}
            isBest={!morphoIsBest}
          />
          <VenueRow name="Morpho" apy={morphoApy} isBest={morphoIsBest} />
        </ul>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Both rates read live from the deployed YieldRouter contract, and
        deposits route to whichever is higher automatically. Neither
        Kinetic nor Morpho has a confirmed Coston2 address yet, so these
        are owner-set placeholder rates rather than the real protocols'
        rates — the routing logic itself is real and tested.
      </p>
    </div>
  );
}

function VenueRow({
  name,
  apy,
  isBest,
}: {
  name: string;
  apy: number | undefined;
  isBest: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between rounded-lg border p-4 ${
        isBest
          ? "border-primary-blue bg-primary-blue/5"
          : "border-border bg-bg-surface"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-text-primary">{name}</span>
        {isBest && (
          <span className="rounded-full bg-primary-blue px-2 py-0.5 text-xs font-semibold text-white">
            Best rate
          </span>
        )}
      </div>
      <span
        className={`num text-lg font-semibold ${
          isBest ? "text-success-green" : "text-text-muted"
        }`}
      >
        {apy !== undefined ? `${apy.toFixed(2)}%` : "—"}
      </span>
    </li>
  );
}

function StatusNotice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 sm:mt-4 rounded-lg bg-bg-surface p-2 sm:p-3 text-sm text-text-muted">
      {children}
    </p>
  );
}
