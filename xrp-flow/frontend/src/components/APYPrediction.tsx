
import { useHistoricalData } from "../hooks/useHistoricalData";
import type { ReactNode } from "react";

interface APYPredictionPoint {
  timestamp: number;
  kineticAPY: number;
  morphoAPY: number;
  bestAPY: number;
}

export default function APYPrediction() {
  const { data: historicalData, isLoading, error } = useHistoricalData();

  if (isLoading) {
    return (
      <EmptyState>
        <p className="text-text-muted">Loading historical data...</p>
      </EmptyState>
    );
  }

  if (error) {
    return (
      <EmptyState>
        <p className="text-danger-red">Error loading data: {error.message}</p>
      </EmptyState>
    );
  }

  if (!historicalData || !Array.isArray(historicalData?.apyHistory) || historicalData?.apyHistory?.length < 2) {
    return (
      <EmptyState>
        <p className="text-text-muted">Not enough historical data for predictions.</p>
      </EmptyState>
    );
  }

  // Simple linear regression for prediction
  const points = historicalData.apyHistory;
  const n = points.length;

  // Calculate averages
  const sumX = points.reduce((sum, _, index) => sum + index, 0);
  const sumY = points.reduce((sum, point) => sum + point.bestAPY, 0);
  const sumXY = points.reduce((sum, point, index) => sum + (index * point.bestAPY), 0);
  const sumX2 = points.reduce((sum, _, index) => sum + (index * index), 0);

  // Calculate slope (m) and intercept (b) for y = mx + b
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict next 7 days (assuming hourly data points)
  const predictionPoints: APYPredictionPoint[] = [];
  const lastPoint = points[points.length - 1];
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;

  for (let i = 1; i <= 24 * 7; i++) {
    const futureIndex = n + i;
    const predictedBestAPY = slope * futureIndex + intercept;

    // Simple assumption: maintain the same ratio between kinetic and morpho
    const ratio = lastPoint.bestAPY > 0 ? lastPoint.kineticAPY / lastPoint.bestAPY : 0.5;
    const predictedKineticAPY = predictedBestAPY * ratio;
    const predictedMorphoAPY = predictedBestAPY * (1 - ratio);

    predictionPoints.push({
      timestamp: now + (i * hourInMs),
      kineticAPY: Math.max(0, predictedKineticAPY),
      morphoAPY: Math.max(0, predictedMorphoAPY),
      bestAPY: Math.max(0, predictedBestAPY)
    });
  }

  const latest = points[points.length - 1];
  const prediction24h = predictionPoints[23]; // 24 hours ahead
  const prediction7d = predictionPoints[predictionPoints.length - 1]; // 7 days ahead

  // SVG Chart parameters
  const chartWidth = 400;
  const chartHeight = 140;
  const paddingX = 30;
  const paddingY = 20;
  const plotWidth = chartWidth - 2 * paddingX;
  const plotHeight = chartHeight - 2 * paddingY;

  const combinedPoints = [...points.map(p => p.bestAPY), ...predictionPoints.map(p => p.bestAPY)];
  const maxAPY = Math.max(...combinedPoints, 1);
  const minAPY = Math.min(...combinedPoints, 0);
  const apyRange = maxAPY === minAPY ? 1 : maxAPY - minAPY;

  const allData = [...points.map(p => p.bestAPY), ...predictionPoints.map(p => p.bestAPY)];
  const linePath = allData.length > 0 
    ? allData.map((val, idx) => {
        const progress = idx / (allData.length - 1);
        const x = paddingX + progress * plotWidth;
        const y = chartHeight - paddingY - ((val - minAPY) / apyRange) * plotHeight;
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      }).join(" ")
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-text-primary">
          APY Prediction Model
        </h3>
        <span className="rounded-full bg-bg-surface px-2.5 py-1 text-xs font-medium text-text-muted">
          Linear regression ({points.length} data points)
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Current APY" value={`${latest.bestAPY.toFixed(2)}%`} subtext={`Kinetic: ${latest.kineticAPY.toFixed(2)}% | Morpho: ${latest.morphoAPY.toFixed(2)}%`} />
        <MetricCard label="Predicted 24h APY" value={`${prediction24h.bestAPY.toFixed(2)}%`} subtext={`Kinetic: ${prediction24h.kineticAPY.toFixed(2)}% | Morpho: ${prediction24h.morphoAPY.toFixed(2)}%`} />
        <MetricCard label="Predicted 7d APY" value={`${prediction7d.bestAPY.toFixed(2)}%`} subtext={`Kinetic: ${prediction7d.kineticAPY.toFixed(2)}% | Morpho: ${prediction7d.morphoAPY.toFixed(2)}%`} />
        
        <div className="rounded-xl border border-border bg-bg-base p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Trend Direction</p>
          <p className={`mt-2 font-bold text-2xl ${
            slope > 0 ? "text-success-green" : slope < 0 ? "text-danger-red" : "text-text-muted"
          }`}>
            {slope > 0 ? "↑ Increasing" : slope < 0 ? "↓ Decreasing" : "→ Stable"}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {Math.abs(slope).toFixed(4)}% per hour
          </p>
        </div>
      </div>

      {/* Trend visualization chart */}
      <div className="rounded-xl border border-border bg-bg-base p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
          Historical & Forecast Trajectory (7 Days)
        </p>
        <div className="relative h-[140px] w-full">
          <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {/* Axes */}
            <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="currentColor" className="text-border" strokeWidth={1} />
            <line x1={paddingX} y1={paddingY} x2={paddingX} y2={chartHeight - paddingY} stroke="currentColor" className="text-border" strokeWidth={1} />

            {/* Regression / Prediction Trend Line */}
            <path
              d={linePath}
              fill="none"
              stroke="currentColor"
              className="text-accent-teal"
              strokeWidth={2}
              strokeDasharray="4,2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-base p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-2 font-bold text-2xl text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-muted truncate">{subtext}</p>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-surface/30 p-8 text-center">
      {children}
    </div>
  );
}