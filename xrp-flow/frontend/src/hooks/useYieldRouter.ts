// import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
// import { useCallback } from "react";
// import { formatUnits } from "viem";
// import { CONTRACTS, isDeployed } from "../contracts";
// import { coston2 } from "../wagmi";

// /**
//  * Hook for interacting with the YieldRouter contract.
//  * Provides functions for reading user data and writing transactions.
//  */
// export function useYieldRouter() {
//   const { address, isConnected } = useAccount();
//   const chainId = useChainId();
//   const publicClient = usePublicClient();
//   const { writeContractAsync } = useWriteContract();

//   const onCorrectNetwork = chainId === coston2.id;
//   const enabled =
//     isDeployed && isConnected && onCorrectNetwork && !!address && !!publicClient;

//   /**
//    * Reads the user's deposit information from the YieldRouter contract.
//    */
//   const readUserDeposit = useCallback(async () => {
//     if (!enabled || !publicClient) {
//       return { amount: 0n, timestamp: 0n };
//     }

//     try {
//       const result = await publicClient.readContract({
//         address: CONTRACTS.yieldRouter.address,
//         abi: CONTRACTS.yieldRouter.abi,
//         functionName: "deposits",
//         args: [address],
//       });

//       if (Array.isArray(result) && result.length >= 2) {
//         return {
//           amount: BigInt(result[0]),
//           timestamp: BigInt(result[1]),
//         };
//       }
//     } catch (error) {
//       console.error("[useYieldRouter] readUserDeposit failed", { error });
//     }

//     return { amount: 0n, timestamp: 0n };
//   }, [enabled, address, publicClient]);

//   /**
//    * Reads the user's current venue (0=Kinetic, 1=Morpho).
//    */
//   const readUserVenue = useCallback(async () => {
//     if (!enabled || !publicClient) {
//       return 0;
//     }

//     try {
//       const result = await publicClient.readContract({
//         address: CONTRACTS.yieldRouter.address,
//         abi: CONTRACTS.yieldRouter.abi,
//         functionName: "userVenue",
//         args: [address],
//       });

//       if (typeof result === "number" || typeof result === "bigint") {
//         return Number(result);
//       }
//     } catch (error) {
//       console.error("[useYieldRouter] readUserVenue failed", { error });
//     }

//     return 0;
//   }, [enabled, address, publicClient]);

//   /**
//    * Reads the best venue based on current APY rates (0=Kinetic, 1=Morpho).
//    */
//   const readBestVenue = useCallback(async () => {
//     if (!enabled || !publicClient) {
//       return 0;
//     }

//     try {
//       const result = await publicClient.readContract({
//         address: CONTRACTS.yieldRouter.address,
//         abi: CONTRACTS.yieldRouter.abi,
//         functionName: "getBestVenue",
//       });

//       if (typeof result === "number" || typeof result === "bigint") {
//         return Number(result);
//       }
//     } catch (error) {
//       console.error("[useYieldRouter] readBestVenue failed", { error });
//     }

//     return 0;
//   }, [enabled, publicClient]);

//   /**
//    * Reads the user's reputation tier.
//    */
//   const readReputationTier = useCallback(async () => {
//     if (!enabled || !publicClient) {
//       return 0;
//     }

//     try {
//       const result = await publicClient.readContract({
//         address: CONTRACTS.yieldRouter.address,
//         abi: CONTRACTS.yieldRouter.abi,
//         functionName: "getReputationTier",
//         args: [address],
//       });

//       if (typeof result === "number" || typeof result === "bigint") {
//         return Number(result);
//       }
//     } catch (error) {
//       console.error("[useYieldRouter] readReputationTier failed", { error });
//     }

//     return 0;
//   }, [enabled, address, publicClient]);

//   /**
//    * Reads the Morpho market configuration parameters.
//    */
//   const readMorphoMarketParams = useCallback(async () => {
//     if (!enabled || !publicClient) {
//       return null;
//     }

//     try {
//       const result = await publicClient.readContract({
//         address: CONTRACTS.yieldRouter.address,
//         abi: CONTRACTS.yieldRouter.abi,
//         functionName: "morphoMarketParams",
//       });

//       if (Array.isArray(result) && result.length >= 5) {
//         return {
//           loanToken: result[0] as `0x${string}`,
//           collateralToken: result[1] as `0x${string}`,
//           oracle: result[2] as `0x${string}`,
//           irm: result[3] as `0x${string}`,
//           lltv: result[4],
//         };
//       }
//     } catch (error) {
//       console.error("[useYieldRouter] readMorphoMarketParams failed", { error });
//     }

//     return null;
//   }, [enabled, publicClient]);

//   /**
//    * Reads current APY rates for Kinetic and Morpho.
//    */
//   const readApyRates = useCallback(async () => {
//     if (!enabled || !publicClient) {
//       return { kineticAPY: 0, morphoAPY: 0 };
//     }

//     try {
//       const [kineticResult, morphoResult] = await Promise.all([
//         publicClient.readContract({
//           address: CONTRACTS.yieldRouter.address,
//           abi: CONTRACTS.yieldRouter.abi,
//           functionName: "kineticMockAPY",
//         }),
//         publicClient.readContract({
//           address: CONTRACTS.yieldRouter.address,
//           abi: CONTRACTS.yieldRouter.abi,
//           functionName: "morphoMockAPY",
//         }),
//       ]);

//       const extractValue = (val: unknown): bigint => {
//         if (typeof val === "bigint") return val;
//         if (Array.isArray(val) && val.length > 0 && typeof val[0] === "bigint") {
//           return val[0];
//         }
//         return 0n;
//       };

//       const kineticRaw = extractValue(kineticResult);
//       const morphoRaw = extractValue(morphoResult);

//       return {
//         kineticAPY: Number(formatUnits(kineticRaw, 18)) * 100,
//         morphoAPY: Number(formatUnits(morphoRaw, 18)) * 100,
//       };
//     } catch (error) {
//       console.error("[useYieldRouter] readApyRates failed", { error });
//     }

//     return { kineticAPY: 0, morphoAPY: 0 };
//   }, [enabled, publicClient]);

//   /**
//    * Reads user FXRP allowance.
//    */
//   const readAllowance = useCallback(async () => {
//     if (!enabled || !publicClient) {
//       return 0n;
//     }

//     try {
//       const result = await publicClient.readContract({
//         address: CONTRACTS.fxrp.address,
//         abi: CONTRACTS.fxrp.abi,
//         functionName: "allowance",
//         args: [address, CONTRACTS.yieldRouter.address],
//       });

//       if (typeof result === "bigint") {
//         return result;
//       }
//     } catch (error) {
//       console.error("[useYieldRouter] readAllowance failed", { error });
//     }

//     return 0n;
//   }, [enabled, address, publicClient]);

//   /**
//    * Reads user FXRP balance.
//    */
//   const readFxrpBalance = useCallback(async () => {
//     if (!enabled || !publicClient) {
//       return 0n;
//     }

//     try {
//       const result = await publicClient.readContract({
//         address: CONTRACTS.fxrp.address,
//         abi: CONTRACTS.fxrp.abi,
//         functionName: "balanceOf",
//         args: [address],
//       });

//       if (typeof result === "bigint") {
//         return result;
//       }
//     } catch (error) {
//       console.error("[useYieldRouter] readFxrpBalance failed", { error });
//     }

//     return 0n;
//   }, [enabled, address, publicClient]);

//   /**
//    * Approves YieldRouter to spend FXRP.
//    */
//   const approve = useCallback(
//     async (amount: bigint) => {
//       if (!enabled || !publicClient) {
//         throw new Error("Wallet not connected or network mismatch");
//       }

//       const hash = await writeContractAsync({
//         address: CONTRACTS.fxrp.address,
//         abi: CONTRACTS.fxrp.abi,
//         functionName: "approve",
//         args: [CONTRACTS.yieldRouter.address, amount],
//         gas: 300000n, // Explicit gas limit to prevent eth_estimateGas freezes
//       });

//       await publicClient.waitForTransactionReceipt({ hash });
//       return hash;
//     },
//     [enabled, publicClient, writeContractAsync]
//   );

//   /**
//    * Auto-routes deposit to the best venue.
//    */
//   const deposit = useCallback(
//     async (amount: bigint) => {
//       if (!enabled || !publicClient) {
//         throw new Error("Wallet not connected or network mismatch");
//       }

//       const hash = await writeContractAsync({
//         address: CONTRACTS.yieldRouter.address,
//         abi: CONTRACTS.yieldRouter.abi,
//         functionName: "deposit",
//         args: [amount],
//         gas: 500000n,
//       });

//       await publicClient.waitForTransactionReceipt({ hash });
//       return hash;
//     },
//     [enabled, publicClient, writeContractAsync]
//   );

//   /**
//    * Deposits FXRP into a specified venue (0=Kinetic, 1=Morpho).
//    */
//   const depositToVenue = useCallback(
//     async (amount: bigint, venue: 0 | 1) => {
//       if (!enabled || !publicClient) {
//         throw new Error("Wallet not connected or network mismatch");
//       }

//       const hash = await writeContractAsync({
//         address: CONTRACTS.yieldRouter.address,
//         abi: CONTRACTS.yieldRouter.abi,
//         functionName: "depositToVenue",
//         args: [amount, venue],
//         gas: 500000n,
//       });

//       await publicClient.waitForTransactionReceipt({ hash });
//       return hash;
//     },
//     [enabled, publicClient, writeContractAsync]
//   );

//   /**
//    * Withdraws FXRP from current venue.
//    */
//   const withdraw = useCallback(
//     async (amount: bigint) => {
//       if (!enabled || !publicClient) {
//         throw new Error("Wallet not connected or network mismatch");
//       }

//       const hash = await writeContractAsync({
//         address: CONTRACTS.yieldRouter.address,
//         abi: CONTRACTS.yieldRouter.abi,
//         functionName: "withdraw",
//         args: [amount],
//         gas: 500000n,
//       });

//       await publicClient.waitForTransactionReceipt({ hash });
//       return hash;
//     },
//     [enabled, publicClient, writeContractAsync]
//   );

//   /**
//    * Rebalances user deposit to the higher yielding venue.
//    */
//   const rebalance = useCallback(async () => {
//     if (!enabled || !publicClient) {
//       throw new Error("Wallet not connected or network mismatch");
//     }

//     const hash = await writeContractAsync({
//       address: CONTRACTS.yieldRouter.address,
//       abi: CONTRACTS.yieldRouter.abi,
//       functionName: "rebalance",
//       args: [],
//       gas: 600000n,
//     });

//     await publicClient.waitForTransactionReceipt({ hash });
//     return hash;
//   }, [enabled, publicClient, writeContractAsync]);

//   return {
//     // Read functions
//     readUserDeposit,
//     readUserVenue,
//     readBestVenue,
//     readReputationTier,
//     readMorphoMarketParams,
//     readApyRates,
//     readAllowance,
//     readFxrpBalance,

//     // Write functions
//     approve,
//     deposit,
//     depositToVenue,
//     withdraw,
//     rebalance,

//     // State
//     enabled,
//     address,
//     isConnected,
//     onCorrectNetwork,
//   };
// }

import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { useCallback } from "react";
import { formatUnits } from "viem";
import { CONTRACTS, isDeployed } from "../contracts";
import { coston2 } from "../wagmi";

/**
 * Helper to check if a transaction failure was caused by user cancellation.
 */
export const isUserRejectedError = (error: any): boolean => {
  return (
    error?.code === 4001 ||
    error?.cause?.code === 4001 ||
    error?.message?.includes("User rejected") ||
    error?.message?.includes("user rejected")
  );
};

/**
 * Hook for interacting with the YieldRouter contract.
 * Provides functions for reading user data and writing transactions.
 */
export function useYieldRouter() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const onCorrectNetwork = chainId === coston2.id;
  const enabled =
    isDeployed && isConnected && onCorrectNetwork && !!address && !!publicClient;

  /**
   * Reads the user's deposit information from the YieldRouter contract.
   */
  const readUserDeposit = useCallback(async () => {
    if (!enabled || !publicClient) {
      return { amount: 0n, timestamp: 0n };
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "deposits",
        args: [address],
      });

      if (Array.isArray(result) && result.length >= 2) {
        return {
          amount: BigInt(result[0]),
          timestamp: BigInt(result[1]),
        };
      }
    } catch (error) {
      console.error("[useYieldRouter] readUserDeposit failed", { error });
    }

    return { amount: 0n, timestamp: 0n };
  }, [enabled, address, publicClient]);

  /**
   * Reads the user's current venue (0=Kinetic, 1=Morpho).
   */
  const readUserVenue = useCallback(async () => {
    if (!enabled || !publicClient) {
      return 0;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "userVenue",
        args: [address],
      });

      if (typeof result === "number" || typeof result === "bigint") {
        return Number(result);
      }
    } catch (error) {
      console.error("[useYieldRouter] readUserVenue failed", { error });
    }

    return 0;
  }, [enabled, address, publicClient]);

  /**
   * Reads the best venue based on current APY rates (0=Kinetic, 1=Morpho).
   */
  const readBestVenue = useCallback(async () => {
    if (!enabled || !publicClient) {
      return 0;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "getBestVenue",
      });

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
   */
  const readReputationTier = useCallback(async () => {
    if (!enabled || !publicClient) {
      return 0;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "getReputationTier",
        args: [address],
      });

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
   */
  const readMorphoMarketParams = useCallback(async () => {
    if (!enabled || !publicClient) {
      return null;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "morphoMarketParams",
      });

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
   * Reads current APY rates for Kinetic and Morpho.
   */
  const readApyRates = useCallback(async () => {
    if (!enabled || !publicClient) {
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

      const extractValue = (val: unknown): bigint => {
        if (typeof val === "bigint") return val;
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === "bigint") {
          return val[0];
        }
        return 0n;
      };

      const kineticRaw = extractValue(kineticResult);
      const morphoRaw = extractValue(morphoResult);

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
   * Reads user FXRP allowance.
   */
  const readAllowance = useCallback(async () => {
    if (!enabled || !publicClient) {
      return 0n;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.fxrp.address,
        abi: CONTRACTS.fxrp.abi,
        functionName: "allowance",
        args: [address, CONTRACTS.yieldRouter.address],
      });

      if (typeof result === "bigint") {
        return result;
      }
    } catch (error) {
      console.error("[useYieldRouter] readAllowance failed", { error });
    }

    return 0n;
  }, [enabled, address, publicClient]);

  /**
   * Reads user FXRP balance.
   */
  const readFxrpBalance = useCallback(async () => {
    if (!enabled || !publicClient) {
      return 0n;
    }

    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.fxrp.address,
        abi: CONTRACTS.fxrp.abi,
        functionName: "balanceOf",
        args: [address],
      });

      if (typeof result === "bigint") {
        return result;
      }
    } catch (error) {
      console.error("[useYieldRouter] readFxrpBalance failed", { error });
    }

    return 0n;
  }, [enabled, address, publicClient]);

  /**
   * Approves YieldRouter to spend FXRP.
   */
  const approve = useCallback(
    async (amount: bigint) => {
      if (!enabled || !publicClient) {
        throw new Error("Wallet not connected or network mismatch");
      }

      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.fxrp.address,
          abi: CONTRACTS.fxrp.abi,
          functionName: "approve",
          args: [CONTRACTS.yieldRouter.address, amount],
          gas: 300000n,
        });

        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (error) {
        if (!isUserRejectedError(error)) {
          console.error("[useYieldRouter] approve failed", error);
        }
        throw error;
      }
    },
    [enabled, publicClient, writeContractAsync]
  );

  /**
   * Auto-routes deposit to the best venue.
   */
  const deposit = useCallback(
    async (amount: bigint) => {
      if (!enabled || !publicClient) {
        throw new Error("Wallet not connected or network mismatch");
      }

      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "deposit",
          args: [amount],
          gas: 500000n,
        });

        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (error) {
        if (!isUserRejectedError(error)) {
          console.error("[useYieldRouter] deposit failed", error);
        }
        throw error;
      }
    },
    [enabled, publicClient, writeContractAsync]
  );

  /**
   * Deposits FXRP into a specified venue (0=Kinetic, 1=Morpho).
   */
  const depositToVenue = useCallback(
    async (amount: bigint, venue: 0 | 1) => {
      if (!enabled || !publicClient) {
        throw new Error("Wallet not connected or network mismatch");
      }

      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "depositToVenue",
          args: [amount, venue],
          gas: 500000n,
        });

        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (error) {
        if (!isUserRejectedError(error)) {
          console.error("[useYieldRouter] depositToVenue failed", error);
        }
        throw error;
      }
    },
    [enabled, publicClient, writeContractAsync]
  );

  /**
   * Withdraws FXRP from current venue.
   */
  const withdraw = useCallback(
    async (amount: bigint) => {
      if (!enabled || !publicClient) {
        throw new Error("Wallet not connected or network mismatch");
      }

      try {
        const hash = await writeContractAsync({
          address: CONTRACTS.yieldRouter.address,
          abi: CONTRACTS.yieldRouter.abi,
          functionName: "withdraw",
          args: [amount],
          gas: 500000n,
        });

        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (error) {
        if (!isUserRejectedError(error)) {
          console.error("[useYieldRouter] withdraw failed", error);
        }
        throw error;
      }
    },
    [enabled, publicClient, writeContractAsync]
  );

  /**
   * Rebalances user deposit to the higher yielding venue.
   */
  const rebalance = useCallback(async () => {
    if (!enabled || !publicClient) {
      throw new Error("Wallet not connected or network mismatch");
    }

    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.yieldRouter.address,
        abi: CONTRACTS.yieldRouter.abi,
        functionName: "rebalance",
        args: [],
        gas: 600000n,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      if (!isUserRejectedError(error)) {
        console.error("[useYieldRouter] rebalance failed", error);
      }
      throw error;
    }
  }, [enabled, publicClient, writeContractAsync]);

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