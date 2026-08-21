import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, isDeployed } from "../contracts";

export function useUserPosition() {
  const { address } = useAccount();

  const { data, refetch, isLoading, isError } = useReadContracts({
    contracts: [
      { ...CONTRACTS.fxrp, functionName: "balanceOf", args: [address || "0x0000000000000000000000000000000000000000"] },
      { ...CONTRACTS.fxrp, functionName: "allowance", args: [address || "0x0000000000000000000000000000000000000000", CONTRACTS.yieldRouter.address] },
      { ...CONTRACTS.yieldRouter, functionName: "deposits", args: [address || "0x0000000000000000000000000000000000000000"] },
      { ...CONTRACTS.fxrp, functionName: "decimals" },
    ],
    query: { enabled: !!address && isDeployed },
  });

  const [balanceData, allowanceData, depositData, decimalsData] = data || [];

  const decimals = (decimalsData?.result as number) ?? 18;
  const rawBalance = (balanceData?.result as bigint) ?? 0n;
  const rawAllowance = (allowanceData?.result as bigint) ?? 0n;
  
  // YieldRouter deposits returns a struct/tuple: [amount, timestamp]
  const depositTuple = depositData?.result as readonly [bigint, bigint] | undefined;
  const rawDeposit = depositTuple?.[0] ?? 0n;
  const depositTimestamp = depositTuple?.[1] ?? 0n;

  // Formatted numbers for UI components and charts
  const walletBalance = Number(formatUnits(rawBalance, decimals));
  const depositedBalance = Number(formatUnits(rawDeposit, decimals));
  const allowance = Number(formatUnits(rawAllowance, decimals));

  return {
    balances: {
      walletBalance,
      depositedBalance,
      allowance,
    },
    raw: {
      walletBalance: rawBalance,
      depositedBalance: rawDeposit,
      allowance: rawAllowance,
      depositTimestamp,
    },
    decimals,
    isLoading,
    isError,
    refetch,
  };
}