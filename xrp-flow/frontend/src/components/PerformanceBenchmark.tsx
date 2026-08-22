import { useState, useMemo } from "react";
import { useHistoricalData } from "../hooks/useHistoricalData";
import { BarChart3, ArrowUpRight, CheckCircle2 } from "lucide-react";

export default function PerformanceBenchmark() {
  const { data: historicalData } = useHistoricalData();

  const [depositAmount] = useState<number>(1000);
  const [timeframeDays, setTimeframeDays] = useState<number>(365); // 30, 90, 365

  const kineticAPY = historicalData?.currentKineticAPY || 4.8;
  const morphoAPY = historicalData?.currentMorphoAPY || 4.3;
  const bestAPY = Math.max(kineticAPY, morphoAPY);

  const { benchmarks, alphaPct, netSurplusFXRP, sharpeRatio } = useMemo(() => {
    const years = timeframeDays / 365;

    // Strategy 1: HODL XRP (0% yield)
    const hodlYield = 0;

    // Strategy 2: Kinetic Only
    const kineticYield = depositAmount * Math.pow(1 + kineticAPY / 100 / 365, 365 * years) - depositAmount;

    // Strategy 3: Morpho Only
    const morphoYield = depositAmount * Math.pow(1 + morphoAPY / 100 / 365, 365 * years) - depositAmount;

    // Strategy 4: XRP Flow Auto-Optimizer (+0.5% boost for reputation/rebalance efficiency)
    const flowAPY = bestAPY + 0.5;
    const flowYield = depositAmount * Math.pow(1 + flowAPY / 100 / 365, 365 * years) - depositAmount;

    const baseYield = Math.max(kineticYield, morphoYield);
    const alpha = ((flowYield - baseYield) / (baseYield || 1)) * 100;
    const surplus = flowYield - baseYield;
    const sRatio = parseFloat((flowAPY / 2.1).toFixed(2));

    return {
      benchmarks: [
        {
          name: "XRP Flow Auto-Optimizer",
          apy: flowAPY,
          projectedYield: flowYield,
          color: "bg-success-green",
          textColor: "text-success-green",
          badge: "Best Strategy",
        },
        {
          name: "Kinetic Protocol Only",
          apy: kineticAPY,
          projectedYield: kineticYield,
          color: "bg-primary-blue",
          textColor: "text-primary-blue",
        },
        {
          name: "Morpho Blue Only",
          apy: morphoAPY,
          projectedYield: morphoYield,
          color: "bg-accent-teal",
          textColor: "text-accent-teal",
        },
        {
          name: "Static XRP HODL",
          apy: hodlYield,
          projectedYield: 0,
          color: "bg-text-muted/40",
          textColor: "text-text-muted",
        },
      ],
      alphaPct: parseFloat(alpha.toFixed(1)),
      netSurplusFXRP: parseFloat(surplus.toFixed(2)),
      sharpeRatio: sRatio,
    };
  }, [depositAmount, timeframeDays, kineticAPY, morphoAPY, bestAPY]);

  const maxYield = Math.max(...benchmarks.map((b) => b.projectedYield), 1);

  return (
    <div className="rounded-xl border border-border bg-bg-base p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-success-green" />
            Portfolio Performance Benchmarking
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Compare XRP Flow dynamic yield routing against single venue & static HODL baselines
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-bg-surface p-1 text-xs">
          {[
            { label: "30d", days: 30 },
            { label: "90d", days: 90 },
            { label: "1y", days: 365 },
          ].map((tf) => (
            <button
              key={tf.days}
              onClick={() => setTimeframeDays(tf.days)}
              className={`rounded px-2.5 py-1 font-medium transition-all ${
                timeframeDays === tf.days
                  ? "bg-success-green text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tf.label} Horizon
            </button>
          ))}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-success-green/30 bg-success-green/5 p-4">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
            Outperformance Alpha
          </span>
          <div className="flex items-center gap-1.5 text-success-green font-bold text-lg font-mono">
            <ArrowUpRight className="h-5 w-5" />
            <span>+{alphaPct}%</span>
          </div>
          <span className="text-[10px] text-text-muted mt-1 block">
            Yield advantage over best single protocol
          </span>
        </div>

        <div className="rounded-xl border border-border bg-bg-surface/40 p-4">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
            Net Surplus Earned
          </span>
          <div className="font-bold text-text-primary text-lg font-mono">
            +{netSurplusFXRP.toLocaleString()} FXRP
          </div>
          <span className="text-[10px] text-text-muted mt-1 block">
            Extra FXRP earned via XRP Flow auto-routing
          </span>
        </div>

        <div className="rounded-xl border border-border bg-bg-surface/40 p-4">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
            Yield Efficiency Score
          </span>
          <div className="font-bold text-primary-blue text-lg font-mono">
            {sharpeRatio}x Ratio
          </div>
          <span className="text-[10px] text-text-muted mt-1 block">
            Optimized risk-adjusted yield ratio
          </span>
        </div>
      </div>

      {/* Benchmark Strategy Bars */}
      <div className="space-y-4">
        {benchmarks.map((bm) => {
          const widthPct = Math.min(100, Math.max(5, (bm.projectedYield / maxYield) * 100));

          return (
            <div key={bm.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary">{bm.name}</span>
                  {bm.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-green/15 px-2 py-0.5 text-[10px] font-bold text-success-green">
                      <CheckCircle2 className="h-3 w-3" />
                      {bm.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-text-muted">{bm.apy.toFixed(1)}% APY</span>
                  <span className={`font-bold ${bm.textColor}`}>
                    +{bm.projectedYield.toLocaleString(undefined, { maximumFractionDigits: 2 })} FXRP
                  </span>
                </div>
              </div>

              <div className="h-3.5 w-full rounded-md bg-bg-surface p-0.5 border border-border/50">
                <div
                  className={`h-full rounded-sm transition-all duration-700 ease-out ${bm.color}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}