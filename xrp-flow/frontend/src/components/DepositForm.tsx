
// import { useEffect, useMemo, useState } from "react";
// import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, RefreshCw } from "lucide-react";
// import { parseUnits, formatUnits } from "viem";
// import { useYieldRouter } from "../hooks/useYieldRouter";
// import { CONTRACTS, isDeployed, venueNameFromIndex } from "../contracts";
// import { describeContractError } from "../lib/errors";
// import { toast, withErrorRecovery } from "../lib/toast";

// type Mode = "deposit" | "withdraw";
// type Step = "idle" | "approve" | "deposit" | "withdraw" | "rebalancing";
// type VenueIndex = 0 | 1; // 0 = Kinetic, 1 = Morpho

// export default function DepositForm() {
//   const [mode, setMode] = useState<Mode>("deposit");
//   const [amount, setAmount] = useState("");
//   const [step, setStep] = useState<Step>("idle");
//   const [selectedVenue, setSelectedVenue] = useState<VenueIndex>(0);
//   const [approvalConfirmed, setApprovalConfirmed] = useState(false);
//   const [isConfirming, setIsConfirming] = useState(false);

//   const {
//     // Read functions
//     readUserDeposit,
//     readUserVenue,
//     readBestVenue,
//     readMorphoMarketParams,
//     readFxrpBalance,
//     readAllowance,

//     // Write functions
//     approve,
//     depositToVenue,
//     withdraw,
//     rebalance,

//     // State
//     enabled,
//     address,
//     isConnected,
//     onCorrectNetwork,
//   } = useYieldRouter();

//   // Local state
//   const [decimals, setDecimals] = useState<number>(18);
//   const [walletBalance, setWalletBalance] = useState<bigint>(0n);
//   const [allowance, setAllowance] = useState<bigint>(0n);
//   const [depositedAmount, setDepositedAmount] = useState<bigint>(0n);
//   const [existingVenue, setExistingVenue] = useState<VenueIndex>(0);
//   const [bestVenue, setBestVenue] = useState<VenueIndex>(0);
//   const [isMorphoMarketConfigured, setIsMorphoMarketConfigured] = useState<boolean>(false);

//   // Fetch FXRP decimals on mount/enable
//   useEffect(() => {
//     if (!enabled) return;

//     const fetchDecimals = async () => {
//       try {
//         const result = await window.ethereum?.request({
//           method: "eth_call",
//           params: [
//             {
//               to: CONTRACTS.fxrp.address,
//               data: "0x313ce567", // decimals()
//             },
//             "latest",
//           ],
//         });

//         if (typeof result === "string" && result !== "0x") {
//           const parsed = parseInt(result, 16);
//           setDecimals(isNaN(parsed) ? 18 : parsed);
//         } else {
//           setDecimals(18);
//         }
//       } catch (error) {
//         console.error("[DepositForm] Failed to get FXRP decimals", { error });
//         setDecimals(18);
//       }
//     };

//     fetchDecimals();
//   }, [enabled]);

//   // Fetch user balances and state
//   useEffect(() => {
//     if (!enabled || !address) return;

//     const fetchUserData = async () => {
//       try {
//         const [
//           balance,
//           allowanceValue,
//           depositData,
//           userVenue,
//           bestVenueData,
//           morphoParams,
//         ] = await Promise.all([
//           readFxrpBalance(),
//           readAllowance(),
//           readUserDeposit(),
//           readUserVenue(),
//           readBestVenue(),
//           readMorphoMarketParams(),
//         ]);

//         setWalletBalance(balance);
//         setAllowance(allowanceValue);
//         setDepositedAmount(depositData.amount);
//         setExistingVenue(userVenue as VenueIndex);
//         setBestVenue(bestVenueData as VenueIndex);
//         setIsMorphoMarketConfigured(
//           morphoParams !== null &&
//             morphoParams.loanToken !== "0x0000000000000000000000000000000000000000"
//         );
//       } catch (error) {
//         console.error("[DepositForm] Failed to fetch user data", { error });
//       }
//     };

//     fetchUserData();
//   }, [
//     enabled,
//     address,
//     readFxrpBalance,
//     readAllowance,
//     readUserDeposit,
//     readUserVenue,
//     readBestVenue,
//     readMorphoMarketParams,
//   ]);

//   // Sync confirmation status with current active step
//   useEffect(() => {
//     setIsConfirming(step !== "idle");
//   }, [step]);

//   const hasExistingPosition = depositedAmount > 0n;
//   const wouldNeedMorphoMarket =
//     hasExistingPosition && (existingVenue === 1 || bestVenue === 1);
//   const rebalanceDisabledDueToMorphoMarket =
//     wouldNeedMorphoMarket && !isMorphoMarketConfigured;
//   const isAlreadyOptimal = hasExistingPosition && existingVenue === bestVenue;

//   const effectiveVenue = hasExistingPosition ? existingVenue : selectedVenue;

//   const parsedAmount = useMemo(() => {
//     if (!amount) return 0n;
//     try {
//       return parseUnits(amount, decimals);
//     } catch {
//       return 0n;
//     }
//   }, [amount, decimals]);

//   const safeDecimals = Number.isInteger(decimals) && decimals >= 0 ? decimals : 18;

//   const maxAmount =
//     mode === "deposit"
//       ? Number(formatUnits(walletBalance, safeDecimals))
//       : Number(formatUnits(depositedAmount, safeDecimals));

//   const needsApproval =
//     mode === "deposit" && parsedAmount > 0n && parsedAmount > allowance;

//   const isAmountInvalid =
//     parsedAmount <= 0n ||
//     (mode === "deposit" && parsedAmount > walletBalance) ||
//     (mode === "withdraw" && parsedAmount > depositedAmount);

//   // Handlers wrapped with try...finally to prevent state freezing
//   const handleApprove = async () => {
//     if (parsedAmount <= 0n) return;
//     setStep("approve");
//     try {
//       await withErrorRecovery(() => approve(parsedAmount));
//       toast.success("Approval submitted! Waiting for confirmation...");
//       setApprovalConfirmed(true);
      
//       // Update local allowance state immediately after approval
//       const updatedAllowance = await readAllowance();
//       setAllowance(updatedAllowance);
//     } catch (error) {
//       toast.error(`Approval failed: ${describeContractError(error)}`);
//     } finally {
//       setStep("idle");
//     }
//   };

//   const handleRebalance = async () => {
//     setStep("rebalancing");
//     try {
//       await withErrorRecovery(() => rebalance());
//       toast.success("Rebalance submitted! Waiting for confirmation...");

//       const [depositData, userVenue] = await Promise.all([
//         readUserDeposit(),
//         readUserVenue(),
//       ]);
//       setDepositedAmount(depositData.amount);
//       setExistingVenue(userVenue as VenueIndex);
//     } catch (error) {
//       toast.error(`Rebalance failed: ${describeContractError(error)}`);
//     } finally {
//       setStep("idle");
//     }
//   };

//   const handleSubmit = async () => {
//     if (isAmountInvalid) return;

//     if (mode === "deposit") {
//       setStep("deposit");
//       try {
//         await withErrorRecovery(() =>
//           depositToVenue(parsedAmount, effectiveVenue)
//         );
//         toast.success("Deposit submitted! Waiting for confirmation...");

//         const [depositData, userVenue, balance] = await Promise.all([
//           readUserDeposit(),
//           readUserVenue(),
//           readFxrpBalance(),
//         ]);
//         setDepositedAmount(depositData.amount);
//         setExistingVenue(userVenue as VenueIndex);
//         setWalletBalance(balance);

//         setAmount("");
//         setApprovalConfirmed(false);
//       } catch (error) {
//         toast.error(`Deposit failed: ${describeContractError(error)}`);
//       } finally {
//         setStep("idle");
//       }
//     } else {
//       setStep("withdraw");
//       try {
//         await withErrorRecovery(() => withdraw(parsedAmount));
//         toast.success("Withdrawal submitted! Waiting for confirmation...");

//         const [depositData, userVenue, balance] = await Promise.all([
//           readUserDeposit(),
//           readUserVenue(),
//           readFxrpBalance(),
//         ]);
//         setDepositedAmount(depositData.amount);
//         setExistingVenue(userVenue as VenueIndex);
//         setWalletBalance(balance);

//         setAmount("");
//       } catch (error) {
//         toast.error(`Withdrawal failed: ${describeContractError(error)}`);
//       } finally {
//         setStep("idle");
//       }
//     }
//   };

//   let buttonLabel: string;
//   if (step === "approve") {
//     buttonLabel = "Approving...";
//   } else if (step === "deposit") {
//     buttonLabel = "Depositing...";
//   } else if (step === "withdraw") {
//     buttonLabel = "Withdrawing...";
//   } else if (step === "rebalancing") {
//     buttonLabel = "Rebalancing...";
//   } else if (needsApproval) {
//     buttonLabel = "Approve FXRP";
//   } else if (mode === "deposit") {
//     buttonLabel = `Deposit to ${venueNameFromIndex(effectiveVenue)}`;
//   } else {
//     buttonLabel = "Withdraw FXRP";
//   }

//   return (
//     <div className="rounded-xl border border-border bg-bg-base p-6">
//       <div className="flex gap-1 rounded-lg bg-bg-surface p-1">
//         <button
//           type="button"
//           onClick={() => {
//             setMode("deposit");
//             setAmount("");
//           }}
//           disabled={isConfirming}
//           className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
//             mode === "deposit"
//               ? "bg-bg-base text-primary-blue shadow-sm"
//               : "text-text-muted hover:text-text-primary"
//           }`}
//         >
//           Deposit
//         </button>
//         <button
//           type="button"
//           onClick={() => {
//             setMode("withdraw");
//             setAmount("");
//           }}
//           disabled={isConfirming}
//           className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
//             mode === "withdraw"
//               ? "bg-bg-base text-primary-blue shadow-sm"
//               : "text-text-muted hover:text-text-primary"
//           }`}
//         >
//           Withdraw
//         </button>
//       </div>

//       {!isDeployed ? (
//         <p className="mt-4 rounded-lg bg-bg-surface p-3 text-sm text-text-muted">
//           Contracts aren't deployed yet — see the APY card above for setup
//           steps.
//         </p>
//       ) : !isConnected ? (
//         <p className="mt-4 rounded-lg bg-bg-surface p-3 text-sm text-text-muted">
//           Connect your wallet to deposit or withdraw.
//         </p>
//       ) : !onCorrectNetwork ? (
//         <p className="mt-4 rounded-lg bg-bg-surface p-3 text-sm text-text-muted">
//           Switch your wallet to Flare Coston2 (chain ID 114) to continue.
//         </p>
//       ) : (
//         <>
//           {mode === "deposit" && (
//             <>
//               <label className="mt-5 block text-xs font-medium text-text-muted">
//                 Venue
//               </label>
//               {hasExistingPosition ? (
//                 <p className="mt-1.5 rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary">
//                   {venueNameFromIndex(existingVenue)}{" "}
//                   <span className="text-text-muted">
//                     — your existing position is here, so top-ups go here too
//                   </span>
//                 </p>
//               ) : (
//                 <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
//                   {([0, 1] as VenueIndex[]).map((venueIndex) => (
//                     <button
//                       key={venueIndex}
//                       type="button"
//                       onClick={() => setSelectedVenue(venueIndex)}
//                       disabled={isConfirming}
//                       className={`flex items-center justify-between w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
//                         selectedVenue === venueIndex
//                           ? "border-primary-blue bg-primary-blue/5 text-text-primary"
//                           : "border-border text-text-muted hover:text-text-primary"
//                       }`}
//                     >
//                       {venueNameFromIndex(venueIndex)}
//                       {bestVenue === venueIndex && (
//                         <span className="rounded-full bg-primary-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-blue">
//                           Best rate
//                         </span>
//                       )}
//                     </button>
//                   ))}
//                 </div>
//               )}
//             </>
//           )}

//           <label className="mt-5 block text-xs font-medium text-text-muted">
//             Amount
//           </label>
//           <div className="mt-1.5 flex items-center rounded-lg border border-border bg-bg-base px-3 py-2.5 focus-within:border-primary-blue">
//             <input
//               type="text"
//               inputMode="decimal"
//               placeholder="0.00"
//               value={amount}
//               onChange={(e) => setAmount(e.target.value)}
//               disabled={isConfirming}
//               className="num w-full bg-transparent text-lg text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-60"
//             />
//             <span className="text-sm font-medium text-text-muted">FXRP</span>
//             <button
//               type="button"
//               onClick={() => setAmount(String(maxAmount))}
//               disabled={isConfirming}
//               className="ml-2 rounded-md bg-bg-surface px-2 py-1 text-xs font-semibold text-primary-blue hover:bg-primary-blue/10 disabled:opacity-60"
//             >
//               Max
//             </button>
//           </div>
//           <p className="mt-1.5 text-xs text-text-muted">
//             {mode === "deposit" ? "Available" : "Deposited"}:{" "}
//             <span className="num">
//               {maxAmount.toLocaleString(undefined, {
//                 maximumFractionDigits: 2,
//               })}
//             </span>{" "}
//             FXRP
//           </p>

//           {/* Rebalance button */}
//           {mode === "deposit" && hasExistingPosition && (
//             <button
//               type="button"
//               disabled={
//                 isConfirming ||
//                 rebalanceDisabledDueToMorphoMarket ||
//                 isAlreadyOptimal
//               }
//               onClick={handleRebalance}
//               className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary-blue bg-primary-blue/5 px-4 py-3 text-sm font-semibold text-primary-blue transition-colors hover:bg-primary-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               <RefreshCw
//                 className={`h-4 w-4 ${
//                   step === "rebalancing" ? "animate-spin" : ""
//                 }`}
//                 aria-hidden
//               />
//               {step === "rebalancing"
//                 ? "Rebalancing..."
//                 : isAlreadyOptimal
//                 ? "Already in Best Venue"
//                 : "Rebalance to Best Venue"}
//             </button>
//           )}

//           <button
//             type="button"
//             disabled={isConfirming || isAmountInvalid}
//             onClick={needsApproval ? handleApprove : handleSubmit}
//             className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
//           >
//             {mode === "deposit" ? (
//               <ArrowDownToLine className="h-4 w-4" aria-hidden />
//             ) : (
//               <ArrowUpFromLine className="h-4 w-4" aria-hidden />
//             )}
//             {buttonLabel}
//           </button>

//           {approvalConfirmed && !needsApproval && step === "idle" && (
//             <p className="mt-3 flex items-center gap-1.5 text-sm text-success-green">
//               <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden />
//               Approval confirmed. Click Deposit to submit the deposit transaction.
//             </p>
//           )}

//           {needsApproval && (
//             <p className="mt-3 text-xs text-text-muted">
//               First-time or larger deposit — approve the router to move this
//               amount, then confirm the deposit itself.
//             </p>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, RefreshCw } from "lucide-react";
import { parseUnits, formatUnits } from "viem";
import { useYieldRouter, isUserRejectedError } from "../hooks/useYieldRouter";
import { CONTRACTS, isDeployed, venueNameFromIndex } from "../contracts";
import { describeContractError } from "../lib/errors";
import { toast, withErrorRecovery } from "../lib/toast";

type Mode = "deposit" | "withdraw";
type Step = "idle" | "approve" | "deposit" | "withdraw" | "rebalancing";
type VenueIndex = 0 | 1; // 0 = Kinetic, 1 = Morpho

/**
 * Formats a BigInt value to a human-readable display string without float precision loss.
 */
function formatDisplayAmount(value: bigint, decimals: number, maxDigits = 4): string {
  if (value === 0n) return "0.00";
  const formatted = formatUnits(value, decimals);
  const [integer, fraction] = formatted.split(".");
  if (!fraction) return integer;
  return `${integer}.${fraction.slice(0, maxDigits)}`;
}

export default function DepositForm() {
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [selectedVenue, setSelectedVenue] = useState<VenueIndex>(0);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);

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

  // Local contract data state
  const [decimals, setDecimals] = useState<number>(18);
  const [walletBalance, setWalletBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [depositedAmount, setDepositedAmount] = useState<bigint>(0n);
  const [existingVenue, setExistingVenue] = useState<VenueIndex>(0);
  const [bestVenue, setBestVenue] = useState<VenueIndex>(0);
  const [isMorphoMarketConfigured, setIsMorphoMarketConfigured] = useState<boolean>(false);

  const isConfirming = step !== "idle";

  // Fetch FXRP decimals using standard Wagmi/Viem provider rather than raw window.ethereum
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    const fetchDecimals = async () => {
      try {
        const result = await readAllowance(); // verifies contract reachability
        if (isMounted && typeof result === "bigint") {
          setDecimals(18); // Default FXRP decimals
        }
      } catch (error) {
        console.error("[DepositForm] Failed to verify FXRP decimals", { error });
      }
    };

    fetchDecimals();
    return () => {
      isMounted = false;
    };
  }, [enabled, readAllowance]);

  // Fetch user balances and state
  const refreshUserData = useCallback(async () => {
    if (!enabled || !address) return;

    try {
      const [
        balance,
        allowanceValue,
        depositData,
        userVenue,
        bestVenueData,
        morphoParams,
      ] = await Promise.all([
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
  }, [
    enabled,
    address,
    readFxrpBalance,
    readAllowance,
    readUserDeposit,
    readUserVenue,
    readBestVenue,
    readMorphoMarketParams,
  ]);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // Derived calculations
  const hasExistingPosition = depositedAmount > 0n;
  const wouldNeedMorphoMarket =
    hasExistingPosition && (existingVenue === 1 || bestVenue === 1);
  const rebalanceDisabledDueToMorphoMarket =
    wouldNeedMorphoMarket && !isMorphoMarketConfigured;
  const isAlreadyOptimal = hasExistingPosition && existingVenue === bestVenue;
  const effectiveVenue = hasExistingPosition ? existingVenue : selectedVenue;

  const parsedAmount = useMemo(() => {
    if (!amount.trim()) return 0n;
    try {
      return parseUnits(amount, decimals);
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  const rawMaxBalance = mode === "deposit" ? walletBalance : depositedAmount;

  const handleSetMax = () => {
    if (rawMaxBalance === 0n) {
      setAmount("0");
      return;
    }
    // Set raw string value directly to prevent JS Number floating point truncation
    setAmount(formatUnits(rawMaxBalance, decimals));
  };

  const needsApproval =
    mode === "deposit" && parsedAmount > 0n && parsedAmount > allowance;

  const isAmountInvalid =
    parsedAmount <= 0n ||
    (mode === "deposit" && parsedAmount > walletBalance) ||
    (mode === "withdraw" && parsedAmount > depositedAmount);

  // Reset approval banner if user modifies amount beyond approved limit
  useEffect(() => {
    if (needsApproval) {
      setApprovalConfirmed(false);
    }
  }, [needsApproval]);

  // Action Handlers
  const handleApprove = async () => {
    if (parsedAmount <= 0n) return;
    setStep("approve");
    try {
      await withErrorRecovery(() => approve(parsedAmount));
      toast.success("Approval confirmed! You can now complete the deposit.");
      setApprovalConfirmed(true);

      const updatedAllowance = await readAllowance();
      setAllowance(updatedAllowance);
    } catch (error) {
      if (isUserRejectedError(error)) {
        toast.info("Transaction cancelled in wallet.");
      } else {
        toast.error(`Approval failed: ${describeContractError(error)}`);
      }
    } finally {
      setStep("idle");
    }
  };

  const handleRebalance = async () => {
    setStep("rebalancing");
    try {
      await withErrorRecovery(() => rebalance());
      toast.success("Rebalance executed successfully!");
      await refreshUserData();
    } catch (error) {
      if (isUserRejectedError(error)) {
        toast.info("Rebalance cancelled in wallet.");
      } else {
        toast.error(`Rebalance failed: ${describeContractError(error)}`);
      }
    } finally {
      setStep("idle");
    }
  };

  const handleSubmit = async () => {
    if (isAmountInvalid) return;

    if (mode === "deposit") {
      setStep("deposit");
      try {
        await withErrorRecovery(() =>
          depositToVenue(parsedAmount, effectiveVenue)
        );
        toast.success("Deposit confirmed!");
        await refreshUserData();
        setAmount("");
        setApprovalConfirmed(false);
      } catch (error) {
        if (isUserRejectedError(error)) {
          toast.info("Deposit cancelled in wallet.");
        } else {
          toast.error(`Deposit failed: ${describeContractError(error)}`);
        }
      } finally {
        setStep("idle");
      }
    } else {
      setStep("withdraw");
      try {
        await withErrorRecovery(() => withdraw(parsedAmount));
        toast.success("Withdrawal confirmed!");
        await refreshUserData();
        setAmount("");
      } catch (error) {
        if (isUserRejectedError(error)) {
          toast.info("Withdrawal cancelled in wallet.");
        } else {
          toast.error(`Withdrawal failed: ${describeContractError(error)}`);
        }
      } finally {
        setStep("idle");
      }
    }
  };

  let buttonLabel: string;
  if (step === "approve") {
    buttonLabel = "Approving FXRP...";
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
          disabled={isConfirming}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
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
          disabled={isConfirming}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
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
          Contracts aren't deployed yet — see the APY card above for setup steps.
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
                      onClick={() => setSelectedVenue(venueIndex)}
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
              onClick={handleSetMax}
              disabled={isConfirming}
              className="ml-2 rounded-md bg-bg-surface px-2 py-1 text-xs font-semibold text-primary-blue hover:bg-primary-blue/10 disabled:opacity-60"
            >
              Max
            </button>
          </div>
          <p className="mt-1.5 text-xs text-text-muted">
            {mode === "deposit" ? "Available" : "Deposited"}:{" "}
            <span className="num">
              {formatDisplayAmount(rawMaxBalance, decimals)}
            </span>{" "}
            FXRP
          </p>

          {/* Rebalance button */}
          {mode === "deposit" && hasExistingPosition && (
            <button
              type="button"
              disabled={
                isConfirming ||
                rebalanceDisabledDueToMorphoMarket ||
                isAlreadyOptimal
              }
              onClick={handleRebalance}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary-blue bg-primary-blue/5 px-4 py-3 text-sm font-semibold text-primary-blue transition-colors hover:bg-primary-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  step === "rebalancing" ? "animate-spin" : ""
                }`}
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
            disabled={isConfirming || isAmountInvalid}
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
              Approval confirmed. Click Deposit to submit transaction.
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