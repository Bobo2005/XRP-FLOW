
import { useState, useEffect } from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CheckCircle2, AlertCircle, Loader2, Fuel } from "lucide-react";
import { CONTRACTS, isDeployed } from "../contracts";
import { describeContractError } from "../lib/errors";
// Adjust this import path to wherever your useYieldRouter hook is located
import { useYieldRouter } from "../hooks/useYieldRouter"; 

type FormMode = "deposit" | "withdraw";

export default function DepositForm() {
  const { address } = useAccount();
  const [mode, setMode] = useState<FormMode>("deposit");
  const [venue, setVenue] = useState<"kinetic" | "morpho">("kinetic");
  const [amount, setAmount] = useState<string>("");
  
  // Success & notification state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submittedAmount, setSubmittedAmount] = useState<string>("");
  const [submittedMode, setSubmittedMode] = useState<FormMode>("deposit");

  // Gas Estimation State
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState<boolean>(false);
  
  const { 
    estimateApproveGas, 
    estimateDepositToVenueGas, 
    estimateWithdrawGas 
  } = useYieldRouter();

  // Reset success message whenever user starts typing or switches modes
  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (successMessage) setSuccessMessage(null);
  };

  const handleModeSwitch = (newMode: FormMode) => {
    setMode(newMode);
    setAmount("");
    setGasEstimate(null);
    if (successMessage) setSuccessMessage(null);
  };

  // Read Token and YieldRouter Data
  const { data: contractsData, refetch } = useReadContracts({
    contracts: [
      { ...CONTRACTS.fxrp, functionName: "balanceOf", args: [address!] },
      { ...CONTRACTS.fxrp, functionName: "allowance", args: [address!, CONTRACTS.yieldRouter.address] },
      { ...CONTRACTS.yieldRouter, functionName: "deposits", args: [address!] },
      { ...CONTRACTS.fxrp, functionName: "decimals" },
    ],
    query: { enabled: !!address && isDeployed },
  });

  const [balanceData, allowanceData, depositData, decimalsData] = contractsData || [];
  const decimals = (decimalsData?.result as number) ?? 18;
  const userBalance = (balanceData?.result as bigint) ?? 0n;
  const allowance = (allowanceData?.result as bigint) ?? 0n;
  const userDeposit = (depositData?.result as readonly [bigint, bigint])?.[0] ?? 0n;

  const parsedAmount = amount ? parseUnits(amount, decimals) : 0n;
  const needsApproval = mode === "deposit" && parsedAmount > 0n && allowance < parsedAmount;

  // Contract Writes
  const { data: hash, isPending, error: writeError, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Debounced Gas Estimation Effect
  useEffect(() => {
    let isActive = true;
    const fetchGas = async () => {
      if (!parsedAmount || parsedAmount <= 0n) {
        setGasEstimate(null);
        return;
      }

      setIsEstimatingGas(true);
      setGasEstimate(null);

      try {
        let estimate;
        if (mode === "deposit") {
          if (needsApproval) {
            estimate = await estimateApproveGas(parsedAmount);
          } else {
            const venueId = venue === "kinetic" ? 0 : 1;
            estimate = await estimateDepositToVenueGas(parsedAmount, venueId);
          }
        } else {
          estimate = await estimateWithdrawGas(parsedAmount);
        }

        if (isActive && estimate) {
          // Format to 6 decimal places max for cleaner UI
          const formatted = Number(estimate.formattedCost).toLocaleString(undefined, {
            maximumFractionDigits: 6
          });
          setGasEstimate(formatted);
        }
      } catch (err) {
        console.warn("Could not estimate gas", err);
      } finally {
        if (isActive) setIsEstimatingGas(false);
      }
    };

    const debounceTimer = setTimeout(fetchGas, 500); // 500ms debounce
    return () => {
      isActive = false;
      clearTimeout(debounceTimer);
    };
  }, [parsedAmount, mode, venue, needsApproval, estimateApproveGas, estimateDepositToVenueGas, estimateWithdrawGas]);

  // Handle successful transaction execution
  useEffect(() => {
    if (isSuccess && submittedAmount) {
      const actionText = submittedMode === "deposit" ? "deposited" : "withdrawn";
      const formattedAmt = Number(submittedAmount).toLocaleString(undefined, {
        maximumFractionDigits: 4,
      });

      setSuccessMessage(`You have successfully ${actionText} ${formattedAmt} FXRP`);
      setAmount("");
      setGasEstimate(null);
      refetch(); // Refresh wallet & vault balances
    }
  }, [isSuccess, submittedAmount, submittedMode, refetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0n) return;

    setSuccessMessage(null);
    setSubmittedAmount(amount);
    setSubmittedMode(mode);

    if (mode === "deposit") {
      if (needsApproval) {
        writeContract({
          ...CONTRACTS.fxrp,
          functionName: "approve",
          args: [CONTRACTS.yieldRouter.address, parsedAmount],
        });
      } else {
        const venueId = venue === "kinetic" ? 0 : 1;
        writeContract({
          ...CONTRACTS.yieldRouter,
          functionName: "depositToVenue",
          args: [parsedAmount, venueId],
        });
      }
    } else {
      writeContract({
        ...CONTRACTS.yieldRouter,
        functionName: "withdraw",
        args: [parsedAmount],
      });
    }
  };

  const handleSetMax = () => {
    if (successMessage) setSuccessMessage(null);
    if (mode === "deposit") {
      setAmount(formatUnits(userBalance, decimals));
    } else {
      setAmount(formatUnits(userDeposit, decimals));
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg-base p-5 sm:p-6 shadow-sm">
      {/* Tab Switcher */}
      <div className="flex border-b border-border mb-5">
        <button
          type="button"
          onClick={() => handleModeSwitch("deposit")}
          className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            mode === "deposit"
              ? "border-primary-blue text-primary-blue"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("withdraw")}
          className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            mode === "withdraw"
              ? "border-primary-blue text-primary-blue"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-success-green/30 bg-success-green/10 p-3.5 text-sm font-medium text-success-green animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification Alert */}
      {writeError && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-danger-red/30 bg-danger-red/10 p-3 text-xs text-danger-red">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{describeContractError(writeError)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "deposit" && (
          <div>
            <label className="block text-xs font-medium text-text-muted mb-2">Venue</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVenue("kinetic")}
                className={`rounded-lg p-2 text-xs font-medium border transition-colors ${
                  venue === "kinetic"
                    ? "border-primary-blue bg-primary-blue/10 text-primary-blue"
                    : "border-border text-text-muted hover:border-text-muted"
                }`}
              >
                Kinetic <span className="ml-1 text-[10px] text-success-green font-bold">Best rate</span>
              </button>
              <button
                type="button"
                onClick={() => setVenue("morpho")}
                className={`rounded-lg p-2 text-xs font-medium border transition-colors ${
                  venue === "morpho"
                    ? "border-primary-blue bg-primary-blue/10 text-primary-blue"
                    : "border-border text-text-muted hover:border-text-muted"
                }`}
              >
                Morpho
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-medium text-text-muted">Amount</label>
            <span className="text-[11px] text-text-muted">
              {mode === "deposit" ? "Available: " : "Deposited: "}
              <span className="font-mono text-text-primary font-medium">
                {mode === "deposit"
                  ? `${Number(formatUnits(userBalance, decimals)).toLocaleString()} FXRP`
                  : `${Number(formatUnits(userDeposit, decimals)).toLocaleString()} FXRP`}
              </span>
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm font-mono text-text-primary focus:border-primary-blue focus:outline-none pr-16"
            />
            <button
              type="button"
              onClick={handleSetMax}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px] font-bold text-primary-blue hover:bg-primary-blue/10 transition-colors"
            >
              MAX
            </button>
          </div>
        </div>
        
        {/* Network Fee Estimation UI */}
        <div className="flex items-center justify-between px-1 h-6">
          <span className="text-xs text-text-muted flex items-center gap-1.5">
            <Fuel className="w-3 h-3" />
            Network Fee
          </span>
          <span className="text-xs font-mono text-text-primary">
            {isEstimatingGas ? (
               <Loader2 className="w-3 h-3 animate-spin inline text-text-muted" />
            ) : gasEstimate ? (
               `~${gasEstimate} C2FLR`
            ) : (
               "--"
            )}
          </span>
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming || !amount || Number(amount) <= 0}
          className="w-full flex justify-center items-center gap-2 rounded-lg bg-primary-blue py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {(isPending || isConfirming) && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending
            ? "Awaiting Wallet Signature..."
            : isConfirming
            ? "Confirming Transaction..."
            : mode === "deposit"
            ? needsApproval
              ? "Approve FXRP"
              : `Deposit to ${venue === "kinetic" ? "Kinetic" : "Morpho"}`
            : "Withdraw FXRP"}
        </button>
      </form>
    </div>
  );
}