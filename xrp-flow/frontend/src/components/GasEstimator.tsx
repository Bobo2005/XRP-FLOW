import * as React from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { CONTRACTS, isDeployed } from "../contracts";
import { coston2 } from "../wagmi";
import { parseUnits } from "viem";
import { describeContractError } from "../lib/errors";

interface TransactionEstimate {
  name: string;
  description: string;
  gasEstimate: bigint | null;
  costInC2FLR: number | null;
  costInUSD: number | null;
  estimateError?: string | null;
}

export default function GasEstimator() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled = isDeployed && isConnected && !!publicClient && onCorrectNetwork;

  const C2FLR_TO_USD_RATE = 0.02; // Approximate, would normally come from oracle

  // Define common transactions to estimate
  const transactions = [
    {
      name: "Deposit",
      description: "Deposit FXRP into YieldRouter",
      functionName: "deposit",
      args: [parseUnits("100", 18)] as const // 100 FXRP
    },
    {
      name: "Withdraw",
      description: "Withdraw FXRP from YieldRouter",
      functionName: "withdraw",
      args: [parseUnits("50", 18)] as const // 50 FXRP
    },
    {
      name: "Rebalance",
      description: "Rebalance between Kinetic and Morpho",
      functionName: "rebalance",
      args: [] as const
    }
  ] as const;

  if (!isDeployed) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">Gas estimation will be available once contracts are deployed.</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">Connect your wallet to see gas estimates.</p>
      </div>
    );
  }

  if (!onCorrectNetwork) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">Switch to Flare Coston2 (chain ID 114) to see gas estimates.</p>
      </div>
    );
  }

  if (!publicClient) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-text-muted">Unable to connect to blockchain node.</p>
      </div>
    );
  }

  // In a real implementation, we would use useQuery or similar to fetch these estimates
  // For simplicity, we'll simulate the data fetching here
  const [estimates, setEstimates] = React.useState<TransactionEstimate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const fetchEstimates = async () => {
      setLoading(true);
      setError(null);
      const results: TransactionEstimate[] = [];

      for (const tx of transactions) {
        try {
          const gasEstimate = await publicClient.estimateContractGas({
            address: CONTRACTS.yieldRouter.address,
            abi: CONTRACTS.yieldRouter.abi,
            functionName: tx.functionName,
            args: tx.args,
            account: address as `0x${string}`
          });

          const costInC2FLR = Number(gasEstimate) * 0.000000001 * 0.02; // Simplified: gas * gasPrice (in C2FLR)
          const costInUSD = costInC2FLR * C2FLR_TO_USD_RATE / 0.02; // Convert to USD

          if (isMounted) {
            results.push({
              ...tx,
              gasEstimate,
              costInC2FLR,
              costInUSD,
              estimateError: null
            });
          }
        } catch (err) {
          console.error(`Failed to estimate gas for ${tx.name}:`, err);
          const estimateError = describeContractError(err);
          if (isMounted) {
            results.push({
              ...tx,
              gasEstimate: null,
              costInC2FLR: null,
              costInUSD: null,
              estimateError
            });
          }
        }
      }

      if (isMounted) {
        setEstimates(results);
        setLoading(false);
      }
    };

    fetchEstimates();

    return () => {
      isMounted = false;
    };
  }, [enabled, publicClient, CONTRACTS.yieldRouter.address, CONTRACTS.yieldRouter.abi]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-text-primary">
          Gas Cost Estimation
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {transactions.map((tx, index) => (
            <div key={index} className="text-center py-3">
              <div className="h-4 w-4 animate-pulse rounded bg-bg-surface mx-auto mb-2"></div>
              <p className="text-xs text-text-muted">{tx.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold text-text-primary">
          Gas Cost Estimation
        </h3>
        <p className="text-text-danger">Error: {error}</p>
      </div>
    );
  }

  if (estimates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted">No transaction data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-text-primary">
          Gas Cost Estimation
        </h3>
        <div className="text-xs text-text-muted">
          Estimates for 100 FXRP deposit, 50 FXRP withdrawal, and rebalance
        </div>
      </div>

      <div className="divide-y divide-border">
        {estimates.map((estimate, index) => (
          <div key={index} className="py-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-text-primary">{estimate.name}</h4>
              <p className="text-xs text-text-muted">{estimate.description}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs text-text-muted">Gas Estimate</p>
                <p className="font-mono">
                  {estimate.gasEstimate !== null
                    ? estimate.gasEstimate.toLocaleString()
                    : estimate.estimateError || "Failed"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Cost (C2FLR)</p>
                <p className="font-mono">
                  {estimate.costInC2FLR !== null
                    ? estimate.costInC2FLR.toFixed(6)
                    : estimate.estimateError || "Failed"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Cost (USD)</p>
                <p className="font-mono">
                  {estimate.costInUSD !== null
                    ? `$${estimate.costInUSD.toFixed(4)}`
                    : estimate.estimateError || "Failed"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-text-muted">
        <p>• Gas prices fluctuate based on network demand</p>
        <p>• Actual costs may vary from these estimates</p>
        <p>• C2FLR price used for conversion: $0.02 (approximate)</p>
      </div>
    </div>
  );
}