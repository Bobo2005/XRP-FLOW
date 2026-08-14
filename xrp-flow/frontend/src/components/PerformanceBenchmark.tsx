import { useAccount, useChainId } from "wagmi";
import { isDeployed } from "../contracts";
import { coston2 } from "../wagmi";
import { useActivityHistory } from "../hooks/useActivityHistory";

interface PerformanceMetrics {
  totalDeposited: number;
  totalWithdrawn: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPercentage: number;
  apr: number;
}

export default function PerformanceBenchmark() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const onCorrectNetwork = chainId === coston2.id;

  if (!isDeployed) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">Performance benchmarking will be available once contracts are deployed.</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">Connect your wallet to see performance benchmarks.</p>
      </div>
    );
  }

  if (!onCorrectNetwork) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">Switch to Flare Coston2 (chain ID 114) to see performance benchmarks.</p>
      </div>
    );
  }

  const { data: activities, isLoading, error } = useActivityHistory(18); // Assuming 18 decimals

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-text-primary">
          Performance Benchmark
        </h3>
        <div className="text-center py-8">
          <p className="text-text-muted">Calculating performance metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-text-primary">
          Performance Benchmark
        </h3>
        <p className="text-text-danger">Error: {error.message}</p>
      </div>
    );
  }

  // Calculate performance metrics from activity history
  const metrics: PerformanceMetrics = {
    totalDeposited: 0,
    totalWithdrawn: 0,
    currentValue: 0,
    totalReturn: 0,
    totalReturnPercentage: 0,
    apr: 0
  };

  if (activities && activities.length > 0) {
    // Calculate totals
    activities.forEach(activity => {
      if (activity.type === "Deposit") {
        metrics.totalDeposited += activity.amount;
      } else if (activity.type === "Withdraw") {
        metrics.totalWithdrawn += activity.amount;
      }
    });

    // Get current deposited amount from contract
    // (in a real implementation, we'd fetch this)
    // For now, we'll estimate based on activities
    metrics.currentValue = metrics.totalDeposited - metrics.totalWithdrawn;

    // Calculate total return (simplified)
    metrics.totalReturn = metrics.currentValue - metrics.totalDeposited;
    metrics.totalReturnPercentage =
      metrics.totalDeposited > 0
        ? (metrics.totalReturn / metrics.totalDeposited) * 100
        : 0;

    // Calculate APR (simplified - assumes constant rate)
    // In reality, this would need to calculate based on time-weighted returns
    const firstActivity = activities[activities.length - 1]; // Oldest first
    const lastActivity = activities[0]; // Newest first

    if (firstActivity && lastActivity && metrics.totalDeposited > 0) {
      const firstDate = new Date(firstActivity.timestamp);
      const lastDate = new Date(lastActivity.timestamp);
      const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 0) {
        // Simple APR calculation
        const totalReturnFactor = 1 + (metrics.totalReturnPercentage / 100);
        metrics.apr = Math.pow(totalReturnFactor, 365 / daysDiff) - 1;
        metrics.apr *= 100; // Convert to percentage
      }
    }
  }

  // For comparison, calculate what holding would have yielded
  // (assuming 0% price change for FXRP - in reality would need price feed)
  const holdingReturn = 0;
  const holdingReturnPercentage = 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-text-primary">
          Performance Benchmark
        </h3>
        <div className="text-xs text-text-muted">
          {activities?.length ?? 0} transactions analyzed
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Actual Performance */}
        <div className="border rounded-xl p-4">
          <p className="text-xs text-text-muted">Your Strategy Performance</p>
          <div className="mt-4">
            <p className="text-sm font-semibold text-text-primary">
              Total Return:
              <span className={`${metrics.totalReturn >= 0 ? "text-success-green" : "text-danger-red"}`}>
                {metrics.totalReturn.toFixed(2)} FXRP ({metrics.totalReturnPercentage.toFixed(2)}%)
              </span>
            </p>
            <p className="text-sm font-semibold text-text-primary mt-2">
              APR:
              <span className={`${metrics.apr >= 0 ? "text-success-green" : "text-danger-red"}`}>
                {metrics.apr.toFixed(2)}%
              </span>
            </p>
          </div>
        </div>

        {/* Buy & Hold Comparison */}
        <div className="border rounded-xl p-4">
          <p className="text-xs text-text-muted">Buy & Hold FXRP</p>
          <div className="mt-4">
            <p className="text-sm font-semibold text-text-primary">
              Total Return:
              <span className="text-text-muted">
                {holdingReturn.toFixed(2)} FXRP ({holdingReturnPercentage.toFixed(2)}%)
              </span>
            </p>
          </div>
        </div>

        {/* Outperformance */}
        <div className="border rounded-xl p-4">
          <p className="text-xs text-text-muted">Outperformance vs Hold</p>
          <div className="mt-4">
            <p className="font-bold text-2xl">
              {((metrics.totalReturnPercentage - holdingReturnPercentage) >= 0
                ? "+"
                : "") +
                (metrics.totalReturnPercentage - holdingReturnPercentage).toFixed(2)}%
            </p>
            <p className="text-xs text-text-muted mt-1">
              {metrics.totalReturnPercentage >= holdingReturnPercentage
                ? "Better than holding"
                : "Worse than holding"}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="mt-6">
        <p className="text-xs text-text-muted font-medium mb-2">Activity Summary</p>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-text-muted">Total Deposited:</p>
            <p className="font-mono text-text-primary">
              {metrics.totalDeposited.toFixed(2)} FXRP
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Withdrawn:</p>
            <p className="font-mono text-text-primary">
              {metrics.totalWithdrawn.toFixed(2)} FXRP
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Current Value:</p>
            <p className="font-mono">
              {metrics.currentValue.toFixed(2)} FXRP
            </p>
          </div>
        </div>
      </div>

      {/* Performance Chart (Simplified) */}
      {activities && activities.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-text-muted font-medium mb-2">Value Over Time (Simplified)</p>
          <div className="relative h-[160px]">
            <div className="absolute inset-0">
              <svg className="w-full h-full">
                {/* Background grid */}
                <path
                  d="M 40 140 L 360 140"
                  stroke="border-border"
                  strokeWidth={1}
                />
                <path
                  d="M 40 20 L 40 140"
                  stroke="border-border"
                  strokeWidth={1}
                />

                {/* Actual value line */}
                <path
                  d={`
                    M 40 140
                    ${activities
                      .slice()
                      .reverse() // Oldest first
                      .map((_, index) => {
                        // Simplified: assume linear growth/decline between transactions
                        const progress = index / Math.max(1, activities.length - 1);
                        const x = 40 + progress * 320;
                        // Simplified value calculation
                        const valueSoFar = activities
                          .slice(0, activities.length - index)
                          .reduce((sum, act) => {
                            return sum + (act.type === "Deposit" ? act.amount : -act.amount);
                          }, 0);
                        const maxValue = Math.max(
                          ...activities
                            .slice()
                            .reverse()
                            .map((_, idx) =>
                              activities
                                .slice(0, activities.length - idx)
                                .reduce((sum, act) =>
                                  sum + (act.type === "Deposit" ? act.amount : -act.amount), 0)
                            ),
                          0
                        ) || 1;
                        const y = 140 - (valueSoFar / maxValue) * 120;
                        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
                      })
                      .join(" ")}
                  `}
                  fill="none"
                  stroke="success-green"
                  strokeWidth={2}
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 text-xs text-text-muted">
        <p>• Performance calculations are simplified estimates</p>
        <p>• Actual returns may vary based on timing and market conditions</p>
        <p>• APR calculation assumes constant compounding (not accurate for volatile returns)</p>
        <p>• For accurate tax and financial advice, consult a professional</p>
      </div>
    </div>
  );
}