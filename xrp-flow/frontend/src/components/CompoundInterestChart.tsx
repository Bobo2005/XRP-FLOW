import { useHistoricalData } from "../hooks/useHistoricalData";
import { useAccount, useChainId } from "wagmi";
import { coston2 } from "../wagmi";

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
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">No historical data available yet.</p>
      </div>
    );
  }

  // Show loading states
  if (!isConnected || !address) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">Connect your wallet to see compound interest projections.</p>
      </div>
    );
  }

  if (!onCorrectNetwork) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">Switch to Flare Coston2 (chain ID 114) to see charts.</p>
      </div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-text-primary">
          Compound Interest Projection
        </h3>
        <div className="text-xs text-text-muted">
          Based on {historicalData.apyHistory.length} data points
        </div>
      </div>

      <div className="relative h-[200px] w-full">
        {/* SVG Chart */}
        <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* Axes */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="border-border"
            strokeWidth={1}
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={chartHeight - padding}
            stroke="border-border"
            strokeWidth={1}
          />

          {/* Y-axis labels (principal and projections) */}
          <text
            x={padding - 5}
            y={chartHeight - padding}
            textAnchor="end"
            className="text-xs text-text-muted"
          >
            $0
          </text>
          <text
            x={padding - 5}
            y={padding + 5}
            textAnchor="end"
            className="text-xs text-text-muted"
          >
            ${Math.round(maxValue).toLocaleString()}
          </text>

          {/* X-axis labels (time) */}
          <text
            x={chartWidth / 2}
            y={chartHeight - padding + 20}
            textAnchor="middle"
            className="text-xs text-text-muted"
          >
            Time (Weeks)
          </text>

          {/* Principal line (flat) */}
          <line
            x1={padding}
            y1={chartHeight - padding - (depositAmount / maxValue) * (chartHeight - 2 * padding)}
            x2={chartWidth - padding}
            y2={chartHeight - padding - (depositAmount / maxValue) * (chartHeight - 2 * padding)}
            stroke="text-text-muted"
            strokeWidth={1}
            strokeDasharray="4,2"
          />
          <text
            x={chartWidth - padding + 5}
            y={chartHeight - padding - (depositAmount / maxValue) * (chartHeight - 2 * padding)}
            className="text-xs text-text-muted"
          >
            Principal
          </text>

          {/* Compound interest projection line */}
          <path
            d={[
              `M ${padding} ${chartHeight - padding - ((projectionPoints[0].value / maxValue) * (chartHeight - 2 * padding))}`,
              projectionPoints
                .slice(1)
                .map(
                  (point) =>
                    `L ${padding + ((point.timestamp - now) / (daysInYear * 24 * 60 * 60 * 1000)) * (chartWidth - 2 * padding)} ${chartHeight - padding - ((point.value / maxValue) * (chartHeight - 2 * padding))}`
                )
                .join(" ")
            ].join(" ")}
            fill="none"
            stroke="success-green"
            strokeWidth={2}
          />

          {/* Points on the line */}
          {projectionPoints.map((point, index) => (
            index % 4 === 0 && // Show every 4th point to avoid clutter
            <circle
              key={index}
              cx={padding + (point.timestamp - now) / (daysInYear * 24 * 60 * 60 * 1000) * (chartWidth - 2 * padding)}
              cy={chartHeight - padding - (point.value / maxValue) * (chartHeight - 2 * padding)}
              r={3}
              fill="success-green"
            />
          ))}
        </svg>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm">
          <p className="text-text-muted">Current Deposit:</p>
          <p className="font-semibold">${depositAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} FXRP</p>
        </div>
        <div className="text-sm">
          <p className="text-text-muted">Projected 1-Year Yield:</p>
          <p className="font-semibold text-success-green">
            ${projectionPoints[projectionPoints.length - 1].value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} FXRP
          </p>
        </div>
        <div className="text-sm">
          <p className="text-text-muted">Average APY (Historical):</p>
          <p className="font-semibold">{averageApy.toFixed(2)}%</p>
        </div>
        <div className="text-sm">
          <p className="text-text-muted">Data Points:</p>
          <p className="font-semibold">{historicalData.apyHistory.length}</p>
        </div>
      </div>
    </div>
  );
}