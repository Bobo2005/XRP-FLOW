import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { useCallback } from "react";
import { formatUnits } from "viem";
import { CONTRACTS, isDeployed } from "../contracts";
import { coston2 } from "../wagmi";

/**
 * Hook for interacting with the YieldRouter contract.
 * Provides functions for reading user data and writing transactions.
 */
export function useYieldRouter() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const walletClient = useWalletClient();
  const onCorrectNetwork = chainId === coston2.id;
  const enabled = isDeployed && isConnected && onCorrectNetwork && !!address && !!publicClient;

  /**
   * Reads the user's deposit information from the YieldRouter contract.
   * @returns Promise containing the user's deposit amount and timestamp
   */
  const readUserDeposit = useCallback(async () => {
    if (!enabled) {
      return { amount: 0n, timestamp: 0n };
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "deposits",
        args: [address],
      });

      // Ensure we have a valid tuple result
      if (Array.isArray(result) && result.length >= 2) {
        return {
          amount: result[0],
          timestamp: result[1],
        };
      }
    } catch (error) {
      console.error("[useYieldRouter] readUserDeposit failed", { error });
    }

    return { amount: 0n, timestamp: 0n };
  }, [enabled, address, publicClient]);

  /**
   * Reads the user's current venue (where their deposit is allocated).
   * @returns Promise containing the venue index (0=Kinetic, 1=Morpho)
   */
  const readUserVenue = useCallback(async () => {
    if (!enabled) {
      return 0; // Default to Kinetic
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "userVenue",
        args: [address],
      });

      // Ensure we have a valid result
      if (typeof result === "number" || typeof result === "bigint") {
        return Number(result);
      }
    } catch (error) {
      console.error("[useYieldRouter] readUserVenue failed", { error });
    }

    return 0;
  }, [enabled, address, publicClient]);

  /**
   * Reads the best venue based on current APY rates.
   * @returns Promise containing the venue index (0=Kinetic, 1=Morpho)
   */
  const readBestVenue = useCallback(async () => {
    if (!enabled) {
      return 0; // Default to Kinetic
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "getBestVenue",
      });

      // Ensure we have a valid result
      if (typeof result === "number" || typeof result === "bigint") {
        return Number(result);
      }
    } catch (error) {
      console.error("[useYieldRouter] readBestVenue failed", { error });
    }

    return 0;
  }, [enabled, publicClient]);

  /**
   * Reads the user's reputation tier.
   * @returns Promise containing the reputation tier index (0=None, 1=Bronze, 2=Silver, 3=Gold)
   */
  const readReputationTier = useCallback(async () => {
    if (!enabled) {
      return 0; // None
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "getReputationTier",
        args: [address],
      });

      // Ensure we have a valid result
      if (typeof result === "number" || typeof result === "bigint") {
        return Number(result);
      }
    } catch (error) {
      console.error("[useYieldRouter] readReputationTier failed", { error });
    }

    return 0;
  }, [enabled, address, publicClient]);

  /**
   * Reads the Morpho market configuration parameters.
   * @returns Promise containing the market parameters or null if not configured
   */
  const readMorphoMarketParams = useCallback(async () => {
    if (!enabled) {
      return null;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "morphoMarketParams",
      });

      // Ensure we have a valid tuple result
      if (Array.isArray(result) && result.length >= 5) {
        return {
          loanToken: result[0] as `0x${string}`,
          collateralToken: result[1] as `0x${string}`,
          oracle: result[2] as `0x${string}`,
          irm: result[3] as `0x${string}`,
          lltv: result[4],
        };
      }
    } catch (error) {
      console.error("[useYieldRouter] readMorphoMarketParams failed", { error });
    }

    return null;
  }, [enabled, publicClient]);

  /**
   * Reads the current APY rates for both venues.
   * @returns Promise containing kineticAPY and morphoAPY as numbers (percentage)
   */
  const readApyRates = useCallback(async () => {
    if (!enabled) {
      return { kineticAPY: 0, morphoAPY: 0 };
    }

    try {
      const [kineticResult, morphoResult] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "kineticMockAPY",
        }),
        publicClient.readContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "morphoMockAPY",
        }),
      ]);

      // Ensure we have valid results
      const kineticRaw = Array.isArray(kineticResult) && kineticResult.length > 0 ? kineticResult[0] : 0n;
      const morphoRaw = Array.isArray(morphoResult) && morphoResult.length > 0 ? morphoResult[0] : 0n;

      return {
        kineticAPY: Number(formatUnits(kineticRaw, 18)) * 100,
        morphoAPY: Number(formatUnits(morphoRaw, 18)) * 100,
      };
    } catch (error) {
      console.error("[useYieldRouter] readApyRates failed", { error });
    }

    return { kineticAPY: 0, morphoAPY: 0 };
  }, [enabled, publicClient]);

  /**
   * Reads the user's FXRP allowance for the YieldRouter contract.
   * @returns Promise containing the allowance amount
   */
  const readAllowance = useCallback(async () => {
    if (!enabled) {
      return 0n;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.fxrp.address,
        abi: CONTRACTS.fxrp.abi,
        functionName: "allowance",
        args: [address, CONTRACTS.yieldRouter.address],
      });

      // Ensure we have a valid result
      if (typeof result === "bigint") {
        return result;
      }
    } catch (error) {
      console.error("[useYieldRouter] readAllowance failed", { error });
    }

    return 0n;
  }, [enabled, address, publicClient]);

  /**
   * Reads the user's FXRP balance.
   * @returns Promise containing the balance amount
   */
  const readFxrpBalance = useCallback(async () => {
    if (!enabled) {
      return 0n;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.fxrp.address,
        abi: CONTRACTS.fxrp.abi,
        functionName: "balanceOf",
        args: [address],
      });

      // Ensure we have a valid result
      if (typeof result === "bigint") {
        return result;
      }
    } catch (error) {
      console.error("[useYieldRouter] readFxrpBalance failed", { error });
    }

    return 0n;
  }, [enabled, address, publicClient]);

  /**
   * Approves the YieldRouter contract to spend FXRP on behalf of the user.
   * @param amount The amount to approve (in wei)
   * @returns Promise that resolves when the transaction is confirmed
   */
  const approve = useCallback(
    async (amount: bigint) => {
      if (!enabled || !walletClient.data) {
        throw new Error("Wallet not connected or contracts not deployed");
      }

      try {
        const hash = await walletClient.data!.writeContract({
          address: CONTRACTS.fxrp.address,
          abi: CONTRACTS.fxrp.abi,
          functionName: "approve",
          args: [CONTRACTS.yieldRouter.address, amount],
        });

        // Wait for transaction confirmation
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (error) {
        console.error("[useYieldRouter] approve failed", { error });
        throw error;
      }
    },
    [enabled, walletClient],
  );

  /**
   * Deposits FXRP into the best available venue (auto-routing).
   * @param amount The amount to deposit (in wei)
   * @returns Promise that resolves when the transaction is confirmed
   */
  const deposit = useCallback(
    async (amount: bigint) => {
      if (!enabled || !walletClient.data) {
        throw new Error("Wallet not connected or contracts not deployed");
      }

      try {
        const hash = await walletClient.data!.writeContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "deposit",
          args: [amount],
        });

        // Wait for transaction confirmation
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (error) {
        console.error("[useYieldRouter] deposit failed", { error });
        throw error;
      }
    },
    [enabled, walletClient],
  );

  /**
   * Deposits FXRP into a specific venue.
   * @param amount The amount to deposit (in wei)
   * @param venue The venue to deposit into (0=Kinetic, 1=Morpho)
   * @returns Promise that resolves when the transaction is confirmed
   */
  const depositToVenue = useCallback(
    async (amount: bigint, venue: 0 | 1) => {
      if (!enabled || !walletClient.data) {
        throw new Error("Wallet not connected or contracts not deployed");
      }

      try {
        const hash = await walletClient.data!.writeContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "depositToVenue",
          args: [amount, venue],
        });

        // Wait for transaction confirmation
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (error) {
        console.error("[useYieldRouter] depositToVenue failed", { error });
        throw error;
      }
    },
    [enabled, walletClient],
  );

  /**
   * Withdraws FXRP from the user's current venue.
   * @param amount The amount to withdraw (in wei)
   * @returns Promise that resolves when the transaction is completed
   */
  const withdraw = useCallback(
    async (amount: bigint) => {
      if (!enabled || !walletClient.data) {
        throw new Error("Wallet not connected or contracts not deployed");
      }

      try {
        const hash = await walletClient.data!.writeContract({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "withdraw",
          args: [amount],
        });

        // Wait for transaction confirmation
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (error) {
        console.error("[useYieldRouter] withdraw failed", { error });
        throw error;
      }
    },
    [enabled, walletClient],
  );

  /**
   * Rebalances the user's deposit to the better-yielding venue.
   * @returns Promise that resolves when the transaction is confirmed
   */
  const rebalance = useCallback(async () => {
    if (!enabled || !walletClient.data) {
      throw new Error("Wallet not connected or contracts not deployed");
    }

    try {
      const hash = await walletClient.data!.writeContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "rebalance",
        args: [],
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error("[useYieldRouter] rebalance failed", { error });
      throw error;
    }
  }, [enabled, walletClient]);

  // Return all the functions and state
  return {
    // Read functions
    readUserDeposit,
    readUserVenue,
    readBestVenue,
    readReputationTier,
    readMorphoMarketParams,
    readApyRates,
    readAllowance,
    readFxrpBalance,

    // Write functions
    approve,
    deposit,
    depositToVenue,
    withdraw,
    rebalance,

    // State
    enabled,
    address,
    isConnected,
    onCorrectNetwork,
  };
}