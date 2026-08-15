
import { useHistoricalData } from "../hooks/useHistoricalData";
import { useAccount, useChainId } from "wagmi";
import { coston2 } from "../wagmi";
import type { ReactNode } from "react";

interface ChartPoint {
  timestamp: number;
  value: number;
}

export default function CompoundInterestChart() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const onCorrectNetwork = chainId === coston2.id;

  const { data: historicalData } = useHistoricalData();

  // For now, we'll use a fixed deposit amount for demonstration
  // In a real implementation, this would come from the user's actual deposit
  const depositAmount = 100; // 100 FXRP for demonstration

  // If no historical data, show placeholder
  if (!historicalData || !Array.isArray(historicalData?.apyHistory) || historicalData?.apyHistory?.length === 0) {
    return (
      <EmptyState>No historical data available yet.</EmptyState>
    );
  }

  // Show loading states
  if (!isConnected || !address) {
    return (
      <EmptyState>Connect your wallet to see compound interest projections.</EmptyState>
    );
  }

  if (!onCorrectNetwork) {
    return (
      <EmptyState>Switch to Flare Coston2 (chain ID 114) to see charts.</EmptyState>
    );
  }

  // Calculate compound growth projection based on historical average APY
  const historicalApys = historicalData.apyHistory.map(point => point.bestAPY);
  const averageApy = historicalApys.reduce((sum, apy) => sum + apy, 0) / historicalApys.length;

  // Generate projection data for 1 year
  const projectionPoints: ChartPoint[] = [];
  const now = Date.now();
  const daysInYear = 365;

  for (let day = 0; day <= daysInYear; day += 7) { // Weekly points
    const futureTimestamp = now + (day * 24 * 60 * 60 * 1000);
    const years = day / daysInYear;

    // Compound interest formula: A = P(1 + r/n)^(nt)
    // compounding daily for simplicity
    const compoundFrequency = 365;
    const futureValue = depositAmount * Math.pow(1 + (averageApy / 100) / compoundFrequency, compoundFrequency * years);
    const yieldAmount = futureValue - depositAmount;

    projectionPoints.push({
      timestamp: futureTimestamp,
      value: yieldAmount
    });
  }

  // Find max value for scaling
  const maxValue = Math.max(
    ...projectionPoints.map(p => p.value),
    depositAmount // Include principal for reference
  );

  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 40;

  // Generate paths for the line and the gradient area
  const linePath = [
    `M ${padding} ${chartHeight - padding - ((projectionPoints[0].value / maxValue) * (chartHeight - 2 * padding))}`,
    ...projectionPoints.slice(1).map((point) => 
      `L ${padding + ((point.timestamp - now) / (daysInYear * 24 * 60 * 60 * 1000)) * (chartWidth - 2 * padding)} ${chartHeight - padding - ((point.value / maxValue) * (chartHeight - 2 * padding))}`
    )
  ].join(" ");

  const areaPath = `${linePath} L ${chartWidth - padding} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`;

  return (
    <div className="rounded-xl border border-border bg-bg-base p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-text-primary">
          Compound Interest Projection
        </h3>
        <span className="rounded-full bg-bg-surface px-2.5 py-1 text-[11px] font-medium text-text-muted">
          1 Year Forecast
        </span>
      </div>

      <div className="relative h-[220px] w-full">
        {/* SVG Chart */}
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <defs>
            <linearGradient id="yield-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" className="text-success-green" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-success-green" />
            </linearGradient>
          </defs>

          {/* Axes */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={chartHeight - padding}
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
          />

          {/* Y-axis labels */}
          <text
            x={padding - 8}
            y={chartHeight - padding + 4}
            textAnchor="end"
            className="fill-text-muted text-[10px] font-medium"
          >
            0
          </text>
          <text
            x={padding - 8}
            y={padding + 4}
            textAnchor="end"
            className="fill-text-muted text-[10px] font-medium"
          >
            {Math.round(maxValue).toLocaleString()}
          </text>

          {/* X-axis labels (time) */}
          <text
            x={chartWidth / 2}
            y={chartHeight - padding + 24}
            textAnchor="middle"
            className="fill-text-muted text-[10px] font-medium uppercase tracking-wider"
          >
            Time (Weeks)
          </text>

          {/* Principal line (flat) */}
          <line
            x1={padding}
            y1={chartHeight - padding - (depositAmount / maxValue) * (chartHeight - 2 * padding)}
            x2={chartWidth - padding}
            y2={chartHeight - padding - (depositAmount / maxValue) * (chartHeight - 2 * padding)}
            stroke="currentColor"
            className="text-text-muted/40"
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
          <text
            x={chartWidth - padding + 8}
            y={chartHeight - padding - (depositAmount / maxValue) * (chartHeight - 2 * padding) + 3}
            className="fill-text-muted text-[10px] font-medium"
          >
            Principal
          </text>

          {/* Gradient Area under line */}
          <path
            d={areaPath}
            fill="url(#yield-gradient)"
          />

          {/* Compound interest projection line */}
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            className="text-success-green drop-shadow-sm"
            strokeWidth={2}
          />

          {/* Points on the line */}
          {projectionPoints.map((point, index) => {
            if (index % 4 !== 0 && index !== projectionPoints.length - 1) return null;
            return (
              <g key={index} className="group cursor-crosshair">
                <circle
                  cx={padding + (point.timestamp - now) / (daysInYear * 24 * 60 * 60 * 1000) * (chartWidth - 2 * padding)}
                  cy={chartHeight - padding - (point.value / maxValue) * (chartHeight - 2 * padding)}
                  r={3.5}
                  fill="currentColor"
                  className="text-bg-base stroke-success-green"
                  strokeWidth={2}
                />
                <title>
                  Week {index}: +{point.value.toFixed(2)} FXRP
                </title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-bg-surface/40 p-4 border border-border/50">
        <StatDetail 
          label="Current Deposit" 
          value={`${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FXRP`} 
        />
        <StatDetail 
          label="Projected 1-Year Yield" 
          value={`+${projectionPoints[projectionPoints.length - 1].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FXRP`} 
          valueClassName="text-success-green" 
        />
        <StatDetail 
          label="Avg APY (Historical)" 
          value={`${averageApy.toFixed(2)}%`} 
        />
        <StatDetail 
          label="Data Points Analyzed" 
          value={historicalData.apyHistory.length.toString()} 
        />
      </div>
    </div>
  );
}

// Helper Components
function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-border border-dashed bg-bg-surface/30 p-8 text-center transition-colors hover:bg-bg-surface/50">
      <p className="text-sm font-medium text-text-muted">{children}</p>
    </div>
  );
}

function StatDetail({ 
  label, 
  value, 
  valueClassName = "text-text-primary" 
}: { 
  label: string; 
  value: string; 
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className={`font-semibold tracking-tight ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}