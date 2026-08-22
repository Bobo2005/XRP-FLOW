import { useState, useMemo } from "react";
import { useHistoricalData } from "../hooks/useHistoricalData";
import { Calculator, Zap } from "lucide-react";

interface CompoundInterestChartProps {}

export default function CompoundInterestChart(_props: CompoundInterestChartProps) {
  const { data: historicalData } = useHistoricalData();

  const defaultAPY = historicalData?.currentBestAPY || 4.8;

  const [principal, setPrincipal] = useState<number>(1000);
  const [apy, setApy] = useState<number>(defaultAPY);
  const [compoundingFreq, setCompoundingFreq] = useState<number>(365); // Daily = 365
  const [timeHorizonMonths, setTimeHorizonMonths] = useState<number>(12); // Default 1 Year

  // Calculate compound projection timeline
  const { projectionPoints, finalCompound, finalSimple, compoundBonus } = useMemo(() => {
    const points: { month: number; simple: number; compound: number }[] = [];
    const r = apy / 100;
    const n = compoundingFreq;

    for (let month = 0; month <= timeHorizonMonths; month++) {
      const t = month / 12;
      // Simple Interest = P * (1 + r * t)
      const simpleVal = principal * (1 + r * t);
      // Compound Interest = P * (1 + r / n)^(n * t)
      const compoundVal = principal * Math.pow(1 + r / n, n * t);

      points.push({
        month,
        simple: parseFloat(simpleVal.toFixed(2)),
        compound: parseFloat(compoundVal.toFixed(2)),
      });
    }

    const endPoint = points[points.length - 1] || { simple: principal, compound: principal };
    const bonus = endPoint.compound - endPoint.simple;

    return {
      projectionPoints: points,
      finalCompound: endPoint.compound,
      finalSimple: endPoint.simple,
      compoundBonus: bonus,
    };
  }, [principal, apy, compoundingFreq, timeHorizonMonths]);

  const maxVal = Math.max(...projectionPoints.map((p) => p.compound), principal * 1.1);
  const minVal = principal * 0.95;

  const chartHeight = 180;
  const chartWidth = 460;
  const paddingX = 40;
  const paddingY = 25;
  const plotW = chartWidth - paddingX * 2;
  const plotH = chartHeight - paddingY * 2;

  const compoundPath = projectionPoints
    .map((p, i) => {
      const x = paddingX + (i / (projectionPoints.length - 1)) * plotW;
      const y = chartHeight - paddingY - ((p.compound - minVal) / (maxVal - minVal || 1)) * plotH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const simplePath = projectionPoints
    .map((p, i) => {
      const x = paddingX + (i / (projectionPoints.length - 1)) * plotW;
      const y = chartHeight - paddingY - ((p.simple - minVal) / (maxVal - minVal || 1)) * plotH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const compoundArea = `${compoundPath} L ${chartWidth - paddingX} ${chartHeight - paddingY} L ${paddingX} ${chartHeight - paddingY} Z`;

  return (
    <div className="rounded-xl border border-border bg-bg-base p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary-blue" />
            Compound Interest Visualizer
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Compare simple vs compound growth across time horizons
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-bg-surface p-1 text-xs">
          {[
            { label: "1m", months: 1 },
            { label: "6m", months: 6 },
            { label: "1y", months: 12 },
            { label: "3y", months: 36 },
            { label: "5y", months: 60 },
          ].map((item) => (
            <button
              key={item.months}
              onClick={() => setTimeHorizonMonths(item.months)}
              className={`rounded px-2.5 py-1 font-medium transition-all ${
                timeHorizonMonths === item.months
                  ? "bg-primary-blue text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1.5">
            Initial Principal (FXRP)
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              value={principal}
              onChange={(e) => setPrincipal(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs font-semibold text-text-primary focus:border-primary-blue focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-text-muted mb-1.5">
            <span>APY Rate</span>
            <span className="text-primary-blue font-bold">{apy.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="25"
            step="0.1"
            value={apy}
            onChange={(e) => setApy(Number(e.target.value))}
            className="w-full accent-primary-blue"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1.5">
            Compounding Frequency
          </label>
          <select
            value={compoundingFreq}
            onChange={(e) => setCompoundingFreq(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs font-semibold text-text-primary focus:border-primary-blue focus:outline-none"
          >
            <option value={365}>Daily (365x / yr)</option>
            <option value={52}>Weekly (52x / yr)</option>
            <option value={12}>Monthly (12x / yr)</option>
            <option value={1}>Annually (1x / yr)</option>
          </select>
        </div>
      </div>

      {/* SVG Growth Chart */}
      <div className="relative h-[200px] w-full mb-4">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="compound-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="currentColor"
            className="text-border"
          />
          <line
            x1={paddingX}
            y1={paddingY}
            x2={paddingX}
            y2={chartHeight - paddingY}
            stroke="currentColor"
            className="text-border"
          />

          {/* Area under compound curve */}
          <path d={compoundArea} fill="url(#compound-grad)" />

          {/* Simple Interest Line (dashed teal) */}
          <path
            d={simplePath}
            fill="none"
            stroke="#0EA5E9"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />

          {/* Compound Interest Line (solid green) */}
          <path d={compoundPath} fill="none" stroke="#10B981" strokeWidth={2.5} />

          {/* Axis Labels */}
          <text
            x={paddingX}
            y={chartHeight - 6}
            className="fill-text-muted text-[10px]"
          >
            Month 0
          </text>
          <text
            x={chartWidth - paddingX}
            y={chartHeight - 6}
            textAnchor="end"
            className="fill-text-muted text-[10px]"
          >
            Month {timeHorizonMonths}
          </text>

          <text
            x={paddingX - 6}
            y={paddingY + 4}
            textAnchor="end"
            className="fill-text-muted text-[10px]"
          >
            {Math.round(maxVal).toLocaleString()}
          </text>
        </svg>
      </div>

      {/* Legend & Key Metrics */}
      <div className="flex items-center justify-between border-t border-border/50 pt-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-text-primary">
            <span className="h-2.5 w-2.5 rounded-full bg-success-green inline-block"></span>
            <span className="font-semibold">Compound:</span>
            <span className="font-mono text-success-green font-bold">
              {finalCompound.toLocaleString(undefined, { maximumFractionDigits: 2 })} FXRP
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-primary-blue inline-block"></span>
            <span>Simple:</span>
            <span className="font-mono">
              {finalSimple.toLocaleString(undefined, { maximumFractionDigits: 2 })} FXRP
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-md bg-success-green/10 px-2.5 py-1 text-success-green font-semibold">
          <Zap className="h-3 w-3" />
          <span>Compounding Bonus: +{compoundBonus.toFixed(2)} FXRP</span>
        </div>
      </div>
    </div>
  );
}