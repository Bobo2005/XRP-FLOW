import { useState, useEffect } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { isDeployed } from "../contracts";
import { coston2 } from "../wagmi";
import { formatUnits } from "viem";
import { Fuel, RefreshCw, Zap } from "lucide-react";

interface GasEstimateItem {
  name: string;
  description: string;
  gasUnits: bigint;
  costFLR: number;
  costUSD: number;
}

export default function GasEstimator() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled = isDeployed && isConnected && !!publicClient && onCorrectNetwork;

  const [gasPriceGwei, setGasPriceGwei] = useState<number>(25);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0); // 0.9, 1.0, 1.2, 1.5
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const FLR_USD_PRICE = 0.02; // Stand-in market rate

  const fetchGasPrice = async () => {
    if (!publicClient) return;
    setIsRefreshing(true);
    try {
      const priceWei = await publicClient.getGasPrice();
      const gweiVal = Number(formatUnits(priceWei, 9));
      setGasPriceGwei(gweiVal > 0 ? gweiVal : 25);
    } catch {
      setGasPriceGwei(25);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchGasPrice();
    }
  }, [enabled]);

  // Standard gas unit estimates for YieldRouter contract functions
  const estimates: GasEstimateItem[] = [
    {
      name: "Deposit FXRP",
      description: "Approve & Deposit FXRP into auto-best yield venue",
      gasUnits: 145000n,
      costFLR: 0,
      costUSD: 0,
    },
    {
      name: "Withdraw FXRP",
      description: "Withdraw position from Kinetic / Morpho venue back to wallet",
      gasUnits: 112000n,
      costFLR: 0,
      costUSD: 0,
    },
    {
      name: "Rebalance Position",
      description: "Move existing deposit to higher paying venue",
      gasUnits: 185000n,
      costFLR: 0,
      costUSD: 0,
    },
    {
      name: "Token Approval",
      description: "Grant router allowance to pull FXRP",
      gasUnits: 46000n,
      costFLR: 0,
      costUSD: 0,
    },
  ].map((item) => {
    const effectiveGwei = gasPriceGwei * speedMultiplier;
    // Fee in wei = gasUnits * (gwei * 1e9 wei/gwei)
    const feeWei = item.gasUnits * BigInt(Math.round(effectiveGwei * 1e9));
    const flrVal = Number(formatUnits(feeWei, 18));
    const usdVal = flrVal * FLR_USD_PRICE;

    return {
      ...item,
      costFLR: flrVal,
      costUSD: usdVal,
    };
  });

  return (
    <div className="rounded-xl border border-border bg-bg-base p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
        <div>
          <h3 className="font-display text-base font-bold text-text-primary flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary-blue" />
            Transaction Gas Cost Estimator
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time gas price tracking & transaction cost predictions on Coston2
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGasPrice}
            disabled={isRefreshing}
            className="flex items-center gap-1 rounded-lg border border-border bg-bg-surface px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-text-primary"
            title="Refresh Gas Price"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{gasPriceGwei.toFixed(1)} Gwei</span>
          </button>
        </div>
      </div>

      {/* Speed Selectors */}
      <div className="mb-5 flex items-center justify-between rounded-xl bg-bg-surface/50 p-3 border border-border/50">
        <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-tier-gold" />
          Gas Speed Preset:
        </span>

        <div className="flex items-center gap-1 text-xs">
          {[
            { label: "Slow", mult: 0.9 },
            { label: "Standard", mult: 1.0 },
            { label: "Fast", mult: 1.2 },
            { label: "Instant", mult: 1.5 },
          ].map((sp) => (
            <button
              key={sp.label}
              onClick={() => {
                setSpeedMultiplier(sp.mult);
              }}
              className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                speedMultiplier === sp.mult
                  ? "bg-primary-blue text-white shadow-sm"
                  : "text-text-muted hover:bg-bg-surface hover:text-text-primary"
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Fee Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {estimates.map((est) => (
          <div
            key={est.name}
            className="rounded-lg border border-border/70 bg-bg-surface/30 p-3.5 transition-all hover:border-primary-blue/30"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-text-primary">{est.name}</span>
              <span className="font-mono text-xs font-bold text-primary-blue">
                {est.costFLR.toFixed(5)} FLR
              </span>
            </div>
            <p className="text-[11px] text-text-muted mb-2 line-clamp-1">{est.description}</p>
            <div className="flex items-center justify-between text-[10px] text-text-muted border-t border-border/40 pt-2 font-mono">
              <span>{est.gasUnits.toLocaleString()} units</span>
              <span>≈ ${est.costUSD < 0.001 ? "<0.001" : est.costUSD.toFixed(3)} USD</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}