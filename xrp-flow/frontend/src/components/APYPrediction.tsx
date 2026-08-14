import { useHistoricalData } from "../hooks/useHistoricalData";

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
      <div className="text-center py-8">
        <p className="text-text-muted">Loading historical data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-text-danger">Error loading data: {error.message}</p>
      </div>
    );
  }

  if (!historicalData || !Array.isArray(historicalData?.apyHistory) || historicalData?.apyHistory?.length < 2) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted">Not enough historical data for predictions.</p>
      </div>
    );
  }

  // Simple linear regression for prediction
  const points = historicalData.apyHistory;
  const n = points.length;

  // Calculate averages
  const sumX = points.reduce((sum, _point, index) => sum + index, 0);
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

  for (let i = 1; i <= 24 * 7; i++) { // Next 7 days, hourly
    const futureIndex = n + i;
    const predictedBestAPY = slope * futureIndex + intercept;

    // Simple assumption: maintain the same ratio between kinetic and morpho
    const ratio = lastPoint.kineticAPY / lastPoint.bestAPY;
    const predictedKineticAPY = predictedBestAPY * ratio;
    const predictedMorphoAPY = predictedBestAPY * (1 - ratio);

    predictionPoints.push({
      timestamp: now + (i * hourInMs),
      kineticAPY: Math.max(0, predictedKineticAPY),
      morphoAPY: Math.max(0, predictedMorphoAPY),
      bestAPY: Math.max(0, predictedBestAPY)
    });
  }

  // Get latest values
  const latest = points[points.length - 1];
  const prediction24h = predictionPoints[23]; // 24 hours ahead
  const prediction7d = predictionPoints[predictionPoints.length - 1]; // 7 days ahead

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-text-primary">
          APY Prediction Model
        </h3>
        <div className="text-xs text-text-muted">
          Linear regression based on {points.length} data points
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border rounded-xl p-4">
          <p className="text-xs text-text-muted">Current APY</p>
          <p className="font-bold text-2xl">
            {latest.bestAPY.toFixed(2)}%
          </p>
          <p className="text-xs text-text-muted mt-1">
            Kinetic: {latest.kineticAPY.toFixed(2)}% | Morpho: {latest.morphoAPY.toFixed(2)}%
          </p>
        </div>

        <div className="border rounded-xl p-4">
          <p className="text-xs text-text-muted">Predicted 24h APY</p>
          <p className="font-bold text-2xl">
            {prediction24h.bestAPY.toFixed(2)}%
          </p>
          <p className="text-xs text-text-muted mt-1">
            Kinetic: {prediction24h.kineticAPY.toFixed(2)}% | Morpho: {prediction24h.morphoAPY.toFixed(2)}%
          </p>
        </div>

        <div className="border rounded-xl p-4">
          <p className="text-xs text-text-muted">Predicted 7d APY</p>
          <p className="font-bold text-2xl">
            {prediction7d.bestAPY.toFixed(2)}%
          </p>
          <p className="text-xs text-text-muted mt-1">
            Kinetic: {prediction7d.kineticAPY.toFixed(2)}% | Morpho: {prediction7d.morphoAPY.toFixed(2)}%
          </p>
        </div>

        <div className="border rounded-xl p-4">
          <p className="text-xs text-text-muted">Trend Direction</p>
          <p className={`font-bold text-2xl ${
            slope > 0 ? "text-success-green" : slope < 0 ? "text-danger-red" : "text-text-muted"
          }`}>
            {slope > 0 ? "↑ Increasing" : slope < 0 ? "↓ Decreasing" : "→ Stable"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {Math.abs(slope).toFixed(4)}% per hour
          </p>
        </div>
      </div>

      {/* Simple trend visualization */}
      <div className="relative h-[120px]">
        <div className="absolute inset-0">
          {/* Draw prediction line */}
          <svg className="w-full h-full">
            <path
              d={`
                M 20 100
                ${points.map((point, i) =>
                  `L ${20 + (i * 80 / Math.max(1, points.length - 1))} ${100 - (point.bestAPY - 0) * 80 / 20}`
                ).join(" ")}
                ${predictionPoints.map((point, i) =>
                  `L ${20 + 80 + (i * 80 / Math.max(1, predictionPoints.length - 1))} ${100 - (point.bestAPY - 0) * 80 / 20}`
                ).join(" ")}
              `}
              fill="none"
              stroke="accent-teal"
              strokeWidth={2}
              strokeDasharray="4,2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}