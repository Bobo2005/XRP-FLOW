import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, RefreshCw } from "lucide-react";
import { parseUnits, formatUnits } from "viem";
import { useYieldRouter } from "../hooks/useYieldRouter";
import { CONTRACTS, isDeployed, venueNameFromIndex } from "../contracts";
import { describeContractError } from "../lib/errors";
import { toast, withErrorRecovery } from "../lib/toast";

type Mode = "deposit" | "withdraw";
type Step = "idle" | "approve" | "deposit" | "withdraw" | "rebalancing";
type VenueIndex = 0 | 1; // 0 = Kinetic, 1 = Morpho, matching the contract's enum

/**
 * Deposit / withdraw card, wired to YieldRouter.depositToVenue()/
 * withdraw() and the FXRP ERC20's approve(). Deposits need an approve()
 * first (the router pulls FXRP via transferFrom); withdrawals don't,
 * since the router already holds the user's deposited FXRP.
 *
 * Venue choice: a user with no existing position can deposit into either
 * Kinetic or Morpho, whichever they prefer — the "Best rate" tag is a
 * hint, not a restriction. Once a position exists, top-ups are locked to
 * that same venue (the contract enforces this too — see VenueMismatch in
 * YieldRouter.sol), so the selector is disabled at that point.
 */
export default function DepositForm() {
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [selectedVenue, setSelectedVenue] = useState<VenueIndex>(0);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const {
    // Read functions
    readUserDeposit,
    readUserVenue,
    readBestVenue,
    readMorphoMarketParams,
    readFxrpBalance,
    readAllowance,

    // Write functions
    approve,
    depositToVenue,
    withdraw,
    rebalance,

    // State
    enabled,
    address,
    isConnected,
    onCorrectNetwork,
  } = useYieldRouter();

  // Local state for data that we need to compute frequently
  const [decimals, setDecimals] = useState<number>(18);
  const [walletBalance, setWalletBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [depositedAmount, setDepositedAmount] = useState<bigint>(0n);
  const [existingVenue, setExistingVenue] = useState<VenueIndex>(0);
  const [bestVenue, setBestVenue] = useState<VenueIndex>(0);
  const [isMorphoMarketConfigured, setIsMorphoMarketConfigured] = useState<boolean>(false);

  // Fetch static data that doesn't change often
  useEffect(() => {
    if (!enabled) return;

    // Get FXRP decimals
    const fetchDecimals = async () => {
      try {
        const result = await window.ethereum?.request({
          method: "eth_call",
          params: [{
            to: CONTRACTS.fxrp.address,
            data: "0x313ce567" // decimals() function selector
          }, "latest"],
        });
        setDecimals(parseInt(result, 16));
      } catch (error) {
        console.error("[DepositForm] Failed to get FXRP decimals", { error });
        setDecimals(18); // fallback
      }
    };

    fetchDecimals();
  }, [enabled]);

  // Fetch user-specific data that can change with transactions
  useEffect(() => {
    if (!enabled || !address) return;

    const fetchUserData = async () => {
      try {
        const [balance, allowanceValue, depositData, userVenue, bestVenueData, morphoParams] = await Promise.all([
          readFxrpBalance(),
          readAllowance(),
          readUserDeposit(),
          readUserVenue(),
          readBestVenue(),
          readMorphoMarketParams(),
        ]);

        setWalletBalance(balance);
        setAllowance(allowanceValue);
        setDepositedAmount(depositData.amount);
        setExistingVenue(userVenue as VenueIndex);
        setBestVenue(bestVenueData as VenueIndex);
        setIsMorphoMarketConfigured(
          morphoParams !== null &&
          morphoParams.loanToken !== "0x0000000000000000000000000000000000000000"
        );
      } catch (error) {
        console.error("[DepositForm] Failed to fetch user data", { error });
      }
    };

    fetchUserData();
  }, [enabled, address, readFxrpBalance, readAllowance, readUserDeposit, readUserVenue, readBestVenue, readMorphoMarketParams]);

  // Refetch user data when a transaction is confirmed
  // Update isConfirming based on step
  useEffect(() => {
    setIsConfirming(step !== "idle");
  }, [step]);

  const hasExistingPosition = depositedAmount > 0n;
  const wouldNeedMorphoMarket = hasExistingPosition && (existingVenue === 1 || bestVenue === 1);
  const rebalanceDisabledDueToMorphoMarket = wouldNeedMorphoMarket && !isMorphoMarketConfigured;
  const isAlreadyOptimal = hasExistingPosition && existingVenue === bestVenue;

  // Which venue a deposit would actually go to: locked to the existing
  // position's venue once one exists, otherwise whatever the user picked.
  const effectiveVenue = hasExistingPosition ? existingVenue : selectedVenue;

  const parsedAmount = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, decimals);
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  const maxAmount =
    mode === "deposit"
      ? Number(formatUnits(walletBalance, decimals))
      : Number(formatUnits(depositedAmount, decimals));

  const needsApproval =
    mode === "deposit" && parsedAmount > 0n && parsedAmount > allowance;

  const handleApprove = async () => {
    setStep("approve");
    try {
      await withErrorRecovery(() =>
        approve(parsedAmount)
      );
      toast.success("Approval submitted! Waiting for confirmation...");
      setApprovalConfirmed(true);
    } catch (error) {
      toast.error(`Approval failed: ${describeContractError(error)}`);
      setStep("idle");
    }
  };

  const handleRebalance = async () => {
    setStep("rebalancing");
    try {
      await withErrorRecovery(() =>
        rebalance()
      );
      toast.success("Rebalance submitted! Waiting for confirmation...");

      // Refetch user data after successful rebalance
      const [depositData, userVenue] = await Promise.all([
        readUserDeposit(),
        readUserVenue(),
      ]);
      setDepositedAmount(depositData.amount);
      setExistingVenue(userVenue as VenueIndex);

      setStep("idle");
    } catch (error) {
      toast.error(`Rebalance failed: ${describeContractError(error)}`);
      setStep("idle");
    }
  };

  const handleSubmit = async () => {
    if (mode === "deposit") {
      setStep("deposit");
      try {
        await withErrorRecovery(() =>
          depositToVenue(parsedAmount, effectiveVenue)
        );
        toast.success("Deposit submitted! Waiting for confirmation...");

        // Refetch user data after successful deposit
        const [depositData, userVenue] = await Promise.all([
          readUserDeposit(),
          readUserVenue(),
        ]);
        setDepositedAmount(depositData.amount);
        setExistingVenue(userVenue as VenueIndex);

        setStep("idle");
        setAmount(""); // Clear amount after successful deposit
        setApprovalConfirmed(false); // Reset approval status
      } catch (error) {
        toast.error(`Deposit failed: ${describeContractError(error)}`);
        setStep("idle");
      }
    } else {
      setStep("withdraw");
      try {
        await withErrorRecovery(() =>
          withdraw(parsedAmount)
        );
        toast.success("Withdrawal submitted! Waiting for confirmation...");

        // Refetch user data after successful withdrawal
        const [depositData, userVenue] = await Promise.all([
          readUserDeposit(),
          readUserVenue(),
        ]);
        setDepositedAmount(depositData.amount);
        setExistingVenue(userVenue as VenueIndex);

        setStep("idle");
        setAmount(""); // Clear amount after successful withdrawal
      } catch (error) {
        toast.error(`Withdrawal failed: ${describeContractError(error)}`);
        setStep("idle");
      }
    }
  };

  let buttonLabel: string;
  if (step === "approve") {
    buttonLabel = "Approving...";
  } else if (step === "deposit") {
    buttonLabel = "Depositing...";
  } else if (step === "withdraw") {
    buttonLabel = "Withdrawing...";
  } else if (step === "rebalancing") {
    buttonLabel = "Rebalancing...";
  } else if (needsApproval) {
    buttonLabel = "Approve FXRP";
  } else if (mode === "deposit") {
    buttonLabel = `Deposit to ${venueNameFromIndex(effectiveVenue)}`;
  } else {
    buttonLabel = "Withdraw FXRP";
  }

  return (
    <div className="rounded-xl border border-border bg-bg-base p-6">
      <div className="flex gap-1 rounded-lg bg-bg-surface p-1">
        <button
          type="button"
          onClick={() => {
            setMode("deposit");
            setAmount("");
          }}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
            mode === "deposit"
              ? "bg-bg-base text-primary-blue shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("withdraw");
            setAmount("");
          }}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
            mode === "withdraw"
              ? "bg-bg-base text-primary-blue shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Withdraw
        </button>
      </div>

      {!isDeployed ? (
        <p className="mt-4 rounded-lg bg-bg-surface p-3 text-sm text-text-muted">
          Contracts aren't deployed yet — see the APY card above for setup
          steps.
        </p>
      ) : !isConnected ? (
        <p className="mt-4 rounded-lg bg-bg-surface p-3 text-sm text-text-muted">
          Connect your wallet to deposit or withdraw.
        </p>
      ) : !onCorrectNetwork ? (
        <p className="mt-4 rounded-lg bg-bg-surface p-3 text-sm text-text-muted">
          Switch your wallet to Flare Coston2 (chain ID 114) to continue.
        </p>
      ) : (
        <>
          {mode === "deposit" && (
            <>
              <label className="mt-5 block text-xs font-medium text-text-muted">
                Venue
              </label>
              {hasExistingPosition ? (
                <p className="mt-1.5 rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary">
                  {venueNameFromIndex(existingVenue)}{" "}
                  <span className="text-text-muted">
                    — your existing position is here, so top-ups go here too
                  </span>
                </p>
              ) : (
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  {([0, 1] as VenueIndex[]).map((venueIndex) => (
                    <button
                      key={venueIndex}
                      type="button"
                      onClick={() => setSelectedVenue(venueIndex as VenueIndex)}
                      disabled={isConfirming}
                      className={`flex items-center justify-between w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                        selectedVenue === venueIndex
                          ? "border-primary-blue bg-primary-blue/5 text-text-primary"
                          : "border-border text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {venueNameFromIndex(venueIndex)}
                      {bestVenue === venueIndex && (
                        <span className="rounded-full bg-primary-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-blue">
                          Best rate
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <label className="mt-5 block text-xs font-medium text-text-muted">
            Amount
          </label>
          <div className="mt-1.5 flex items-center rounded-lg border border-border bg-bg-base px-3 py-2.5 focus-within:border-primary-blue">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isConfirming}
              className="num w-full bg-transparent text-lg text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-60"
            />
            <span className="text-sm font-medium text-text-muted">FXRP</span>
            <button
              type="button"
              onClick={() => setAmount(String(maxAmount))}
              disabled={isConfirming}
              className="ml-2 rounded-md bg-bg-surface px-2 py-1 text-xs font-semibold text-primary-blue hover:bg-primary-blue/10 disabled:opacity-60"
            >
              Max
            </button>
          </div>
          <p className="mt-1.5 text-xs text-text-muted">
            {mode === "deposit" ? "Available" : "Deposited"}:{" "}
            <span className="num">
              {maxAmount.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </span>{" "}
            FXRP
          </p>

          {/* Rebalance button - enabled when contract is ready */}
          {mode === "deposit" && hasExistingPosition && (
            <button
              type="button"
              disabled={isConfirming || rebalanceDisabledDueToMorphoMarket || isAlreadyOptimal}
              onClick={handleRebalance}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary-blue bg-primary-blue/5 px-4 py-3 text-sm font-semibold text-primary-blue transition-colors hover:bg-primary-blue/10 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <RefreshCw
                className={`h-4 w-4 ${step === "rebalancing" ? "animate-spin" : ""}`}
                aria-hidden
              />
              {step === "rebalancing"
                ? "Rebalancing..."
                : isAlreadyOptimal
                  ? "Already in Best Venue"
                  : "Rebalance to Best Venue"}
            </button>
          )}

          <button
            type="button"
            disabled={isConfirming}
            onClick={needsApproval ? handleApprove : handleSubmit}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mode === "deposit" ? (
              <ArrowDownToLine className="h-4 w-4" aria-hidden />
            ) : (
              <ArrowUpFromLine className="h-4 w-4" aria-hidden />
            )}
            {buttonLabel}
          </button>

          {approvalConfirmed && !needsApproval && step === "idle" && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-success-green">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden />
              Approval confirmed. Click Deposit to submit the deposit transaction.
            </p>
          )}

          {needsApproval && (
            <p className="mt-3 text-xs text-text-muted">
              First-time or larger deposit — approve the router to move this
              amount, then confirm the deposit itself.
            </p>
          )}
        </>
      )}
    </div>
  );
}