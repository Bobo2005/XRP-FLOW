import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccount, useChainId, useDisconnect, useReadContracts } from "wagmi";
import { AlertTriangle, AlertCircle, LogOut } from "lucide-react";
import { formatUnits } from "viem";
import APYComparison from "../components/APYComparison";
import DepositForm from "../components/DepositForm";
import ReputationBadge from "../components/ReputationBadge";
import ActivityTable from "../components/ActivityTable";
import CompoundInterestChart from "../components/CompoundInterestChart";
import APYPrediction from "../components/APYPrediction";
import GasEstimator from "../components/GasEstimator";
import PerformanceBenchmark from "../components/PerformanceBenchmark";
import { CONTRACTS, isDeployed, tierNameFromIndex } from "../contracts";
import { coston2 } from "../wagmi";
import { describeContractError } from "../lib/errors";
import { useHistoricalData, calculateTierProgress } from "../hooks/useHistoricalData";

const TABS = ["Dashboard", "Reputation", "History", "Analytics"] as const;
type Tab = (typeof TABS)[number];

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");

  // No wallet connected — send the visitor back to the landing page rather
  // than showing an empty dashboard.
  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  if (!isConnected || !address) {
    return null;
  }

  const onWrongNetwork = chainId !== coston2.id;

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-10">
            <Link
              to="/"
              className="font-display text-lg font-extrabold text-text-primary"
            >
              XRP Flow
            </Link>
            <nav className="hidden gap-1 sm:flex">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-primary-blue/10 text-primary-blue"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${
                onWrongNetwork
                  ? "bg-danger-red/10 text-danger-red"
                  : "bg-success-green/10 text-success-green"
              }`}
            >
              {onWrongNetwork && (
                <AlertTriangle className="h-3 w-3" aria-hidden />
              )}
              {onWrongNetwork ? "Wrong network" : "Coston2"}
            </span>
            <span className="num hidden rounded-full border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary sm:inline-block">
              {truncateAddress(address)}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-blue to-accent-teal text-[10px] font-bold uppercase text-white">
              {address.slice(2, 4)}
            </div>
            <button
              type="button"
              onClick={() => disconnect()}
              title="Disconnect wallet"
              aria-label="Disconnect wallet"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-danger-red hover:text-danger-red"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {(activeTab === "Dashboard" || activeTab === "Reputation") && (
          <StatRow address={address} onWrongNetwork={onWrongNetwork} />
        )}

        {activeTab === "Dashboard" && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              <APYComparison />
              <DepositForm />
            </div>
            <div className="mt-6">
              <ReputationBadge />
            </div>
            <div className="mt-6">
              <ActivityTable />
            </div>
          </>
        )}

        {activeTab === "Reputation" && (
          <div className="max-w-xl">
            <ReputationBadge />
          </div>
        )}

        {activeTab === "History" && <ActivityTable />}

        {activeTab === "Analytics" && (
          <>
            <div className="mb-8">
              <CompoundInterestChart />
            </div>
            <div className="mb-8">
              <APYPrediction />
            </div>
            <div className="mb-8">
              <GasEstimator />
            </div>
            <div className="mb-8">
              <PerformanceBenchmark />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/**
 * Total Deposited, Current Best APY, Reputation Tier, and Est. Annual
 * Yield — all read live from YieldRouter. Est. Annual Yield is computed
 * client-side as depositedAmount * currentAPY, since the contract doesn't
 * expose that product directly.
 */
function StatRow({
  address,
  onWrongNetwork,
}: {
  address: `0x${string}`;
  onWrongNetwork: boolean;
}) {
  const enabled = isDeployed && !onWrongNetwork;

  const { data, isLoading, isError, error } = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...CONTRACTS.fxrp, functionName: "decimals" },
      {
        ...CONTRACTS.yieldRouter,
        functionName: "deposits",
        args: [address],
      },
      { ...CONTRACTS.yieldRouter, functionName: "getCurrentAPY" },
      {
        ...CONTRACTS.yieldRouter,
        functionName: "getReputationTier",
        args: [address],
      },
      { ...CONTRACTS.yieldRouter, functionName: "bronzeThreshold" },
      { ...CONTRACTS.yieldRouter, functionName: "silverThreshold" },
      { ...CONTRACTS.yieldRouter, functionName: "goldThreshold" },
    ],
    query: { enabled },
  });

  // Fetch historical APY data - MUST be called before any early returns to preserve Hooks order
  const {
    data: historicalData,
    isLoading: historicalLoading,
    error: historicalError
  } = useHistoricalData();

  if (!isDeployed) {
    return (
      <StatNotice>
        Contracts aren't deployed yet — see the APY card below for setup
        steps.
      </StatNotice>
    );
  }
  if (onWrongNetwork) {
    return (
      <StatNotice>
        Switch your wallet to Flare Coston2 (chain ID 114) to see your
        stats.
      </StatNotice>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border bg-bg-surface"
          />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <p className="mb-8 flex items-center gap-1.5 text-sm text-danger-red">
        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden />
        {describeContractError(error)}
      </p>
    );
  }

  const [decimals, depositRecord, rawApy, tierRaw, bronzeThreshold, silverThreshold, goldThreshold] = data as unknown as [
    number,
    readonly [bigint, bigint],
    bigint,
    number | bigint,
    bigint,
    bigint,
    bigint
  ];

  const totalDeposited = Number(formatUnits(depositRecord[0], decimals));
  const currentBestApy = Number(formatUnits(rawApy, 18)) * 100;
  const reputationTier = tierNameFromIndex(Number(tierRaw));
  const estimatedAnnualYield = totalDeposited * (currentBestApy / 100);

  // Calculate tier progress
  const depositAmount = depositRecord[0];
  const daysHeld = depositRecord[1] > 0 ? (Math.max(0, (Date.now() / 1000) - Number(depositRecord[1])) / (24 * 60 * 60)) : 0;
  const currentScore = depositAmount * BigInt(Math.floor(daysHeld));

  const tierProgress = calculateTierProgress(
    currentScore,
    bronzeThreshold,
    silverThreshold,
    goldThreshold
  );

  // Helper function to get tier progress class name
  const getTierProgressClassName = (progress: number): string => {
    return progress >= 80
      ? "text-success-green"
      : progress >= 50
      ? "text-warning-amber"
      : "text-text-muted";
  };

  return ( <>
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Deposited"
        value={`${totalDeposited.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} FXRP`}
      />
      <StatCard
        label="Current Best APY"
        value={`${currentBestApy.toFixed(2)}%`}
        valueClassName="text-success-green"
      />
      <StatCard label="Reputation Tier" value={reputationTier} />
      <StatCard
        label="Est. Annual Yield"
        value={`${estimatedAnnualYield.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} FXRP`}
      />
    </div>

    {/* Additional metrics row */}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="To Next Tier"
        value={`${tierProgress.progressToNext}%`}
        valueClassName={getTierProgressClassName(tierProgress.progressToNext)}
      >
        {tierProgress.nextTierName}
      </StatCard>
      <StatCard
        label="Monthly Yield"
        value={`${(estimatedAnnualYield / 12).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} FXRP`}
      />
      <StatCard
        label="Weekly Yield"
        value={`${(estimatedAnnualYield / 52).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} FXRP`}
      />
      <StatCard
        label="Daily Yield"
        value={`${(estimatedAnnualYield / 365).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} FXRP`}
      />
    </div>

    {/* Historical APY Trend */}
    <div className="mb-6 sm:mb-8">
      <h3 className="mb-3 sm:mb-4 font-display text-base font-bold text-text-primary">
        APY Trend (24h)
      </h3>
      <div className="rounded-xl border border-border bg-bg-base p-4 sm:p-6">
        {historicalLoading ? (
          <div className="text-center py-6 sm:py-8">
            <div className="h-4 w-4 animate-pulse rounded bg-bg-surface mx-auto mb-3 sm:mb-4"></div>
            <p className="text-sm text-text-muted">Loading historical data...</p>
          </div>
        ) : historicalError ? (
          <p className="text-center text-danger-red">
            Error loading historical data: {historicalError?.message || 'Unknown error'}
          </p>
        ) : Array.isArray(historicalData?.apyHistory) && historicalData.apyHistory.length > 0 ? (
          <div className="relative w-full max-h-[350px] overflow-y-auto pr-2">
            {/* APY Points and Labels - Removed absolute positioning to prevent overlap */}
            <div className="flex flex-col gap-4">
              {historicalData.apyHistory.map((point, index) => {
                const isLast = index === historicalData.apyHistory.length - 1;
                const kineticHeight = ((point.kineticAPY / 10) * 100);
                const morphoHeight = ((point.morphoAPY / 10) * 100);
                const bestHeight = ((point.bestAPY / 10) * 100);

                return (
                  <div key={index} className="flex flex-col items-start relative w-full">
                    {/* Hour label */}
                    {!isLast && (
                      <span className="text-xs text-text-muted mb-1">
                        {new Date(point.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </span>
                    )}

                    {/* APY bars container - gave it a set visual height for the bars */}
                    <div className="relative w-full h-8 bg-bg-surface/20 rounded">
                      {/* Kinetic bar */}
                      <div className="absolute left-0 bottom-0 w-1/3 bg-primary-blue/30"
                           style={{ height: `${kineticHeight}%` }}></div>
                      {/* Morpho bar */}
                      <div className="absolute left-1/3 bottom-0 w-1/3 bg-success-green/30"
                           style={{ height: `${morphoHeight}%` }}></div>
                      {/* Best bar */}
                      <div className="absolute left-2/3 bottom-0 w-1/3 bg-accent-teal/30"
                           style={{ height: `${bestHeight}%` }}></div>
                    </div>

                    {/* Last point labels */}
                    {isLast && (
                      <div className="mt-2 flex justify-between w-full text-xs font-medium">
                        <span>Kinetic: {point.kineticAPY.toFixed(2)}%</span>
                        <span>Morpho: {point.morphoAPY.toFixed(2)}%</span>
                        <span>Best: {point.bestAPY.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-center text-text-muted py-6 sm:py-8">
            No historical data available
          </p>
        )}
      </div>
    </div>
  </> );
}

function StatNotice({ children }: { children: ReactNode }) {
  return (
    <p className="mb-6 sm:mb-8 rounded-lg bg-bg-surface p-2 sm:p-3 text-sm text-text-muted">
      {children}
    </p>
  );
}

function StatCard({
  label,
  value,
  valueClassName = "text-text-primary",
  children,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-base p-4 sm:p-5">
      <p className="text-xs sm:text-sm font-medium text-text-muted">{label}</p>
      <p className={`num mt-2 sm:mt-1.5 text-base sm:text-xl font-bold ${valueClassName}`}>
        {value}
      </p>
      {children && (
        <p className="mt-2 sm:mt-1 text-xs sm:text-sm text-text-muted">
          {children}
        </p>
      )}
    </div>
  );
}