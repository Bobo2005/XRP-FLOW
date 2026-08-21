// import { useQuery, useQueryClient } from '@tanstack/react-query'
// import { useAccount, usePublicClient } from 'wagmi'
// import { formatUnits, erc20Abi } from 'viem'
// import { CONTRACTS } from "../../contracts";
// import { coston2 } from '../../wagmi';

// interface BalanceState {
//   address: string | null
//   balance: bigint | null
//   formattedBalance: string | null
// }

// // Cache configuration
// const CACHE_TIME_MS = 5 * 60 * 1000 // 5 minutes
// const STALE_TIME_MS = 2 * 60 * 1000 // 2 minutes
// const DEFAULT_DECIMALS = 18

// export function useBalanceCache() {
//   // 1. Grab chainId to ensure cache invalidates when networks switch
//   const { address, isConnected, chainId } = useAccount()
//   const publicClient = usePublicClient()
//   const queryClient = useQueryClient()

//   const {
//     data: balanceData,
//     isLoading,
//     error,
//   } = useQuery({
//     // 2. Add chainId to queryKey. Otherwise, switching networks will show the old network's balance!
//     queryKey: ['balance', address, chainId],
//     queryFn: async (): Promise<BalanceState> => {
//       if (!address || !isConnected || !publicClient) {
//         return {
//           address: null,
//           balance: null,
//           formattedBalance: null,
//         }
//       }

//       try {
//         // 3. Optimize by fetching decimals and balance in a single Multicall batch
//         const [decimalsData, balanceData] = await publicClient.multicall({
//           contracts: [
//             {
//               address: CONTRACTS.fxrp.address,
//               abi: CONTRACTS.fxrp.abi,
//               functionName: 'decimals',
//             },
//             {
//               address: CONTRACTS.fxrp.address,
//               abi: CONTRACTS.fxrp.abi,
//               functionName: 'balanceOf',
//               args: [address],
//             },
//           ],
//         })

//         const decimals = decimalsData.status === 'success' ? Number(decimalsData.result) : DEFAULT_DECIMALS
//         const balance = balanceData.status === 'success' ? (balanceData.result as bigint) : 0n

//         return {
//           address,
//           balance,
//           formattedBalance: parseFloat(formatUnits(balance, decimals)).toFixed(4),
//         }
//       } catch (err) {
//         console.error('Failed to fetch balance:', err)
//         throw err
//       }
//     },
//     enabled: !!address && isConnected && !!publicClient,
//     staleTime: STALE_TIME_MS,
//     gcTime: CACHE_TIME_MS,
//   })

//   // NOTE: The prefetching useEffect was completely removed. 
//   // React Query automatically fetches whenever the queryKey (address/chainId) changes. 
//   // A redundant useEffect creates race conditions and infinite loops.

//   return {
//     ...balanceData,
//     isLoading: isLoading || (!!address && isConnected && !balanceData),
//     error: error ?? null,
//     refetch: () => queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] }),
//   }
// }

// // Hook for caching multiple token balances
// export function useMultiBalanceCache(tokens: { address: `0x${string}`; symbol: string }[]) {
//   const { address, isConnected, chainId } = useAccount()
//   const publicClient = usePublicClient()

//   const {
//     data: balances = {},
//     isLoading,
//     error,
//     refetch
//   } = useQuery({
//     // React Query natively hashes array references in keys, no need for JSON.stringify
//     queryKey: ['multi-balance', address, chainId, tokens],
//     queryFn: async () => {
//       if (!address || !isConnected || !publicClient || tokens.length === 0) {
//         return {}
//       }

//       // 4. Use viem's multicall instead of Promise.all
//       // This prevents RPC rate limiting by packing all requests into a single network call
//       const contracts = tokens.flatMap((token) => [
//         {
//           address: token.address,
//           abi: erc20Abi, // viem provides standard ABIs natively
//           functionName: 'decimals',
//         },
//         {
//           address: token.address,
//           abi: erc20Abi,
//           functionName: 'balanceOf',
//           args: [address],
//         },
//       ])

//       const results = await publicClient.multicall({ contracts })
//       const tokenBalances: Record<string, { balance: bigint; formatted: string }> = {}

//       // Map the flat results back to our tokens
//       tokens.forEach((token, index) => {
//         const decimalsResult = results[index * 2]
//         const balanceResult = results[index * 2 + 1]

//         const decimals = decimalsResult.status === 'success' ? Number(decimalsResult.result) : DEFAULT_DECIMALS
//         const balance = balanceResult.status === 'success' ? (balanceResult.result as bigint) : 0n

//         tokenBalances[token.symbol] = {
//           balance,
//           formatted: formatUnits(balance, decimals),
//         }
//       })

//       return tokenBalances
//     },
//     enabled: !!address && isConnected && !!publicClient && tokens.length > 0,
//     staleTime: STALE_TIME_MS,
//     gcTime: CACHE_TIME_MS,
//   })

//   return {
//     balances,
//     isLoading,
//     error,
//     refetch
//   }
// }

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits, erc20Abi } from 'viem'
import { CONTRACTS } from "../../contracts";

interface BalanceState {
  address: string | null
  balance: bigint | null
  formattedBalance: string | null
}

// Cache configuration
const CACHE_TIME_MS = 5 * 60 * 1000 // 5 minutes
const STALE_TIME_MS = 2 * 60 * 1000 // 2 minutes
const DEFAULT_DECIMALS = 18

export function useBalanceCache() {
  // 1. Grab chainId to ensure cache invalidates when networks switch
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()

  const {
    data: balanceData,
    isLoading,
    error,
  } = useQuery({
    // 2. Add chainId to queryKey. Otherwise, switching networks will show the old network's balance!
    queryKey: ['balance', address, chainId],
    queryFn: async (): Promise<BalanceState> => {
      if (!address || !isConnected || !publicClient) {
        return {
          address: null,
          balance: null,
          formattedBalance: null,
        }
      }

      try {
        // 3. Optimize by fetching decimals and balance in a single Multicall batch
        const [decimalsData, balanceData] = await publicClient.multicall({
          contracts: [
            {
              address: CONTRACTS.fxrp.address,
              abi: CONTRACTS.fxrp.abi,
              functionName: 'decimals',
            },
            {
              address: CONTRACTS.fxrp.address,
              abi: CONTRACTS.fxrp.abi,
              functionName: 'balanceOf',
              args: [address],
            },
          ],
        })

        const decimals = decimalsData.status === 'success' ? Number(decimalsData.result) : DEFAULT_DECIMALS
        const balance = balanceData.status === 'success' ? (balanceData.result as bigint) : 0n

        return {
          address,
          balance,
          formattedBalance: parseFloat(formatUnits(balance, decimals)).toFixed(4),
        }
      } catch (err) {
        console.error('Failed to fetch balance:', err)
        throw err
      }
    },
    enabled: !!address && isConnected && !!publicClient,
    staleTime: STALE_TIME_MS,
    gcTime: CACHE_TIME_MS,
  })

  // NOTE: The prefetching useEffect was completely removed. 
  // React Query automatically fetches whenever the queryKey (address/chainId) changes. 
  // A redundant useEffect creates race conditions and infinite loops.

  return {
    ...balanceData,
    isLoading: isLoading || (!!address && isConnected && !balanceData),
    error: error ?? null,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] }),
  }
}

// Hook for caching multiple token balances
export function useMultiBalanceCache(tokens: { address: `0x${string}`; symbol: string }[]) {
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()

  const {
    data: balances = {},
    isLoading,
    error,
    refetch
  } = useQuery({
    // React Query natively hashes array references in keys, no need for JSON.stringify
    queryKey: ['multi-balance', address, chainId, tokens],
    queryFn: async () => {
      if (!address || !isConnected || !publicClient || tokens.length === 0) {
        return {}
      }

      // 4. Use viem's multicall instead of Promise.all
      // This prevents RPC rate limiting by packing all requests into a single network call
      const contracts = tokens.flatMap((token) => [
        {
          address: token.address,
          abi: erc20Abi, // viem provides standard ABIs natively
          functionName: 'decimals',
        },
        {
          address: token.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        },
      ])

      const results = await publicClient.multicall({ contracts })
      const tokenBalances: Record<string, { balance: bigint; formatted: string }> = {}

      // Map the flat results back to our tokens
      tokens.forEach((token, index) => {
        const decimalsResult = results[index * 2]
        const balanceResult = results[index * 2 + 1]

        const decimals = decimalsResult.status === 'success' ? Number(decimalsResult.result) : DEFAULT_DECIMALS
        const balance = balanceResult.status === 'success' ? (balanceResult.result as bigint) : 0n

        tokenBalances[token.symbol] = {
          balance,
          formatted: formatUnits(balance, decimals),
        }
      })

      return tokenBalances
    },
    enabled: !!address && isConnected && !!publicClient && tokens.length > 0,
    staleTime: STALE_TIME_MS,
    gcTime: CACHE_TIME_MS,
  })

  return {
    balances,
    isLoading,
    error,
    refetch
  }
}