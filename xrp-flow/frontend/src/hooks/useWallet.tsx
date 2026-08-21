
// import { useCallback } from "react";
// import { useWalletClient, useAccount, useConnect, useDisconnect } from "wagmi";
// import { coston2 } from "../wagmi";
// import { useBalanceCache } from "../lib/wallet/balanceCache";
// import { useAddressBook } from "../lib/wallet/addressBook";
// import { useNetworkSwitcher } from "../lib/wallet/connector";

// type EnhancedWalletHook = {
//   account: string | null;
//   isConnected: boolean;
//   isConnecting: boolean;
//   walletName: string | null;
//   walletClient: any;
//   network: any;
//   isOnCorrectNetwork: boolean;
//   balance: string | null;
//   balanceIsLoading: boolean;
//   balanceError: Error | null;
//   connect: () => Promise<void>;
//   disconnect: () => void;
//   switchToCoston2: () => Promise<any>;
//   addressBook: ReturnType<typeof useAddressBook>;
//   isMetaMask: boolean;
//   isWalletConnect: boolean;
//   isCoinbaseWallet: boolean;
// };

// // Fixed: Exported as named export "useWallet" instead of "default"
// export function useWallet(): EnhancedWalletHook {
//   // Corrected Wagmi v2 destructuring
//   const { address, isConnected, isConnecting, chain, connector } = useAccount();
//   const { connectAsync, connectors } = useConnect();
//   const { disconnect } = useDisconnect();
//   const { data: walletClient } = useWalletClient();

//   // Custom hooks
//   const balanceCache = useBalanceCache();
//   const addressBook = useAddressBook();
//   const networkSwitcher = useNetworkSwitcher();

//   // Wagmi v2 tracks active connector info directly—no window/UA checks needed!
//   const walletName = connector?.name || null;
//   const connectorId = connector?.id?.toLowerCase() || "";
  
//   const isMetaMask = connectorId.includes("metamask");
//   const isWalletConnect = connectorId.includes("walletconnect");
//   const isCoinbaseWallet = connectorId.includes("coinbase");

//   const isOnCorrectNetwork = chain?.id === coston2.id;

//   const handleConnect = useCallback(async () => {
//     try {
//       const targetConnector = connectors[0];
//       if (targetConnector) {
//         await connectAsync({ connector: targetConnector });
//       }
//     } catch (error) {
//       console.error("Failed to connect wallet:", error);
//       throw error;
//     }
//   }, [connectAsync, connectors]);

//   const handleDisconnect = useCallback(() => {
//     disconnect();
//   }, [disconnect]);

//   const switchNetwork = useCallback(async () => {
//     return await networkSwitcher.switchToCoston2();
//   }, [networkSwitcher]);

//   return {
//     account: address || null,
//     isConnected,
//     isConnecting,
//     walletName,
//     walletClient,
//     network: chain,
//     isOnCorrectNetwork,
//     balance: balanceCache.formattedBalance,
//     balanceIsLoading: balanceCache.isLoading,
//     balanceError: balanceCache.error,
//     connect: handleConnect,
//     disconnect: handleDisconnect,
//     switchToCoston2: switchNetwork,
//     addressBook,
//     isMetaMask,
//     isWalletConnect,
//     isCoinbaseWallet,
//   };
// }

import { useCallback } from "react";
import { useWalletClient, useAccount, useConnect, useDisconnect } from "wagmi";
import { coston2 } from "../wagmi";
import { useBalanceCache } from "../lib/wallet/balanceCache";
import { useAddressBook } from "../lib/wallet/addressBook";
import { useNetworkSwitcher } from "../lib/wallet/connector";

type EnhancedWalletHook = {
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletName: string | null;
  walletClient: any;
  network: any;
  isOnCorrectNetwork: boolean;
  balance: string | null;
  balanceIsLoading: boolean;
  balanceError: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToCoston2: () => Promise<any>;
  addressBook: ReturnType<typeof useAddressBook>;
  isMetaMask: boolean;
  isWalletConnect: boolean;
  isCoinbaseWallet: boolean;
};

// Fixed: Exported as named export "useWallet" instead of "default"
export function useWallet(): EnhancedWalletHook {
  // Corrected Wagmi v2 destructuring
  const { address, isConnected, isConnecting, chain, connector } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  // Custom hooks
  const balanceCache = useBalanceCache();
  const addressBook = useAddressBook();
  const networkSwitcher = useNetworkSwitcher();

  // Wagmi v2 tracks active connector info directly—no window/UA checks needed!
  const walletName = connector?.name || null;
  const connectorId = connector?.id?.toLowerCase() || "";
  
  const isMetaMask = connectorId.includes("metamask");
  const isWalletConnect = connectorId.includes("walletconnect");
  const isCoinbaseWallet = connectorId.includes("coinbase");

  const isOnCorrectNetwork = chain?.id === coston2.id;

  const handleConnect = useCallback(async () => {
    try {
      const targetConnector = connectors[0];
      if (targetConnector) {
        await connectAsync({ connector: targetConnector });
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }, [connectAsync, connectors]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const switchNetwork = useCallback(async () => {
    return await networkSwitcher.switchToCoston2();
  }, [networkSwitcher]);

  return {
    account: address ?? null,
    isConnected,
    isConnecting,
    walletName,
    walletClient,
    network: chain,
    isOnCorrectNetwork,
    balance: balanceCache.formattedBalance,
    balanceIsLoading: balanceCache.isLoading,
    balanceError: balanceCache.error,
    connect: handleConnect,
    disconnect: handleDisconnect,
    switchToCoston2: switchNetwork,
    addressBook,
    isMetaMask,
    isWalletConnect,
    isCoinbaseWallet,
  };
}