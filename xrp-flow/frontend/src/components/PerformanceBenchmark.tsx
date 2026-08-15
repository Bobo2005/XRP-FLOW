

import { useAccount, useChainId } from "wagmi";
import { isDeployed } from "../contracts";
import { coston2 } from "../wagmi";
import { useActivityHistory } from "../hooks/useActivityHistory";
import type { ReactNode } from "react";

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
      <EmptyState>
        Performance benchmarking will be available once contracts are deployed.
      </EmptyState>
    );
  }

  if (!isConnected) {
    return (
      <EmptyState>
        Connect your wallet to see performance benchmarks.
      </EmptyState>
    );
  }

  if (!onCorrectNetwork) {
    return (
      <EmptyState>
        Switch to Flare Coston2 (chain ID 114) to see performance benchmarks.
      </EmptyState>
    );
  }

  const { data: activities, isLoading, error } = useActivityHistory(18);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-text-primary">
          Performance Benchmark
        </h3>
        <div className="py-8 text-center">
          <p className="text-sm text-text-muted">Calculating performance metrics...</p>
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
        <p className="text-sm text-danger-red">Error: {error.message}</p>
      </div>
    );
  }

  const metrics: PerformanceMetrics = {
    totalDeposited: 0,
    totalWithdrawn: 0,
    currentValue: 0,
    totalReturn: 0,
    totalReturnPercentage: 0,
    apr: 0,
  };

  // Process activities chronologically (oldest first)
  const chronologicalActivities = activities ? [...activities].reverse() : [];
  let runningBalance = 0;

  const historyPoints = chronologicalActivities.map((activity) => {
    if (activity.type === "Deposit") {
      metrics.totalDeposited += activity.amount;
      runningBalance += activity.amount;
    } else if (activity.type === "Withdraw") {
      metrics.totalWithdrawn += activity.amount;
      runningBalance -= activity.amount;
    }
    return {
      timestamp: activity.timestamp,
      value: runningBalance,
    };
  });

  if (activities && activities.length > 0) {
    metrics.currentValue = metrics.totalDeposited - metrics.totalWithdrawn;
    metrics.totalReturn = metrics.currentValue - metrics.totalDeposited;
    metrics.totalReturnPercentage =
      metrics.totalDeposited > 0
        ? (metrics.totalReturn / metrics.totalDeposited) * 100
        : 0;

    const firstActivity = chronologicalActivities[0];
    const lastActivity = chronologicalActivities[chronologicalActivities.length - 1];

    if (firstActivity && lastActivity && metrics.totalDeposited > 0) {
      const firstDate = new Date(firstActivity.timestamp);
      const lastDate = new Date(lastActivity.timestamp);
      const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 0) {
        const totalReturnFactor = 1 + metrics.totalReturnPercentage / 100;
        if (totalReturnFactor > 0) {
          metrics.apr = (Math.pow(totalReturnFactor, 365 / daysDiff) - 1) * 100;
        } else {
          // Negative return factor caps at -100% APR instead of NaN
          metrics.apr = -100;
        }
      }
    }
  }

  const holdingReturn = 0;
  const holdingReturnPercentage = 0;
  const outperformance = metrics.totalReturnPercentage - holdingReturnPercentage;

  // SVG Chart parameters
  const chartWidth = 400;
  const chartHeight = 160;
  const paddingX = 40;
  const paddingY = 20;
  const plotWidth = chartWidth - 2 * paddingX;
  const plotHeight = chartHeight - 2 * paddingY;

  // Dynamic range calculation handling negative balances
  const allValues = historyPoints.map((p) => p.value);
  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 1;

  // Include 0 in range so baseline is properly anchored
  const minValue = Math.min(rawMin, 0);
  const maxValue = Math.max(rawMax, 0);
  const valueRange = maxValue === minValue ? 1 : maxValue - minValue;

  const linePath =
    historyPoints.length > 0
      ? historyPoints
          .map((point, index) => {
            const progress =
              historyPoints.length === 1 ? 0.5 : index / (historyPoints.length - 1);
            const x = paddingX + progress * plotWidth;
            const normalizedValue = (point.value - minValue) / valueRange;
            const y = chartHeight - paddingY - normalizedValue * plotHeight;
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ")
      : "";

  const areaPath =
    historyPoints.length > 0
      ? `${linePath} L ${paddingX + plotWidth} ${chartHeight - paddingY} L ${paddingX} ${chartHeight - paddingY} Z`
      : "";

  // Position for 0 reference line (if data spans across negative and positive values)
  const zeroY = chartHeight - paddingY - ((0 - minValue) / valueRange) * plotHeight;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-text-primary">
          Performance Benchmark
        </h3>
        <span className="rounded-full bg-bg-surface px-2.5 py-1 text-xs font-medium text-text-muted">
          {activities?.length ?? 0} transactions analyzed
        </span>
      </div>

      {/* Performance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Actual Performance */}
        <div className="rounded-xl border border-border bg-bg-base p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Your Strategy
          </p>
          <div className="mt-3 space-y-2">
            <div>
              <p className="text-xs text-text-muted">Total Return</p>
              <p
                className={`text-sm font-semibold ${
                  metrics.totalReturn >= 0 ? "text-success-green" : "text-danger-red"
                }`}
              >
                {metrics.totalReturn >= 0 ? "+" : ""}
                {metrics.totalReturn.toFixed(2)} FXRP ({metrics.totalReturnPercentage.toFixed(2)}%)
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Estimated APR</p>
              <p
                className={`text-sm font-semibold ${
                  metrics.apr >= 0 ? "text-success-green" : "text-danger-red"
                }`}
              >
                {metrics.apr.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Buy & Hold Comparison */}
        <div className="rounded-xl border border-border bg-bg-base p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Buy & Hold FXRP
          </p>
          <div className="mt-3">
            <p className="text-xs text-text-muted">Total Return</p>
            <p className="text-sm font-semibold text-text-muted">
              {holdingReturn.toFixed(2)} FXRP ({holdingReturnPercentage.toFixed(2)}%)
            </p>
          </div>
        </div>

        {/* Outperformance */}
        <div className="rounded-xl border border-border bg-bg-base p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Outperformance vs Hold
          </p>
          <div className="mt-3">
            <p
              className={`text-2xl font-bold tracking-tight ${
                outperformance >= 0 ? "text-success-green" : "text-danger-red"
              }`}
            >
              {outperformance >= 0 ? "+" : ""}
              {outperformance.toFixed(2)}%
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {outperformance >= 0 ? "Outperforming buy & hold" : "Underperforming buy & hold"}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="rounded-xl border border-border/50 bg-bg-surface/40 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
          Activity Summary
        </p>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-text-muted">Total Deposited</p>
            <p className="font-mono font-medium text-text-primary">
              {metrics.totalDeposited.toFixed(2)} FXRP
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Withdrawn</p>
            <p className="font-mono font-medium text-text-primary">
              {metrics.totalWithdrawn.toFixed(2)} FXRP
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Current Value</p>
            <p className="font-mono font-medium text-text-primary">
              {metrics.currentValue.toFixed(2)} FXRP
            </p>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      {historyPoints.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-bg-base p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
            Value Over Time
          </p>
          <div className="relative h-[160px] w-full overflow-hidden">
            <svg
              className="h-full w-full"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            >
              <defs>
                <linearGradient id="benchmark-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    stopOpacity="0.2"
                    className={metrics.totalReturn >= 0 ? "text-success-green" : "text-danger-red"}
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity="0"
                    className={metrics.totalReturn >= 0 ? "text-success-green" : "text-danger-red"}
                  />
                </linearGradient>
              </defs>

              {/* Axes */}
              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
              <line
                x1={paddingX}
                y1={paddingY}
                x2={paddingX}
                y2={chartHeight - paddingY}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />

              {/* Baseline reference line at 0 when balance goes negative */}
              {minValue < 0 && maxValue > 0 && (
                <line
                  x1={paddingX}
                  y1={zeroY}
                  x2={chartWidth - paddingX}
                  y2={zeroY}
                  stroke="currentColor"
                  className="text-text-muted/40"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
              )}

              {/* Area gradient */}
              <path d={areaPath} fill="url(#benchmark-gradient)" />

              {/* Actual value line */}
              <path
                d={linePath}
                fill="none"
                stroke="currentColor"
                className={metrics.totalReturn >= 0 ? "text-success-green" : "text-danger-red"}
                strokeWidth={2}
              />

              {/* Interactive Data Points */}
              {historyPoints.map((point, index) => {
                const progress =
                  historyPoints.length === 1 ? 0.5 : index / (historyPoints.length - 1);
                const cx = paddingX + progress * plotWidth;
                const normalizedValue = (point.value - minValue) / valueRange;
                const cy = chartHeight - paddingY - normalizedValue * plotHeight;

                return (
                  <g key={index} className="group cursor-crosshair">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="currentColor"
                      className={`text-bg-base ${
                        metrics.totalReturn >= 0 ? "stroke-success-green" : "stroke-danger-red"
                      }`}
                      strokeWidth={2}
                    />
                    <title>
                      {new Date(point.timestamp).toLocaleDateString()}: {point.value.toFixed(2)} FXRP
                    </title>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Disclaimers */}
      <div className="space-y-1 text-xs text-text-muted">
        <p>• Performance calculations are simplified estimates based on account transaction history.</p>
        <p>• Actual returns may vary based on market conditions, gas fees, and slippage.</p>
        <p>• APR calculation assumes constant compounding and historical continuity.</p>
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-surface/30 p-8 text-center">
      <p className="text-sm font-medium text-text-muted">{children}</p>
    </div>
  );
}