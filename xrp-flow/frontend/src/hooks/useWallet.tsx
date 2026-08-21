// import { useEffect, useState, useCallback } from "react";
// import { useWalletClient, useAccount, useConnect, useDisconnect, useNetwork, useProvider } from "wagmi";
// import { formatUnits, parseUnits } from "viem";
// import { CONTRACTS, isDeployed } from "../contracts";
// import { coston2 } from "../wagmi";
// import { useBalanceCache } from "../lib/wallet/balanceCache";
// import { useAddressBook } from "../lib/wallet/addressBook";
// import { useNetworkSwitcher } from "../lib/wallet/connector";

// type EnhancedWalletHook = {
//   // Basic connection info
//   account: string | null;
//   isConnected: boolean;
//   isConnecting: boolean;

//   // Wallet details
//   walletName: string | null;
//   walletClient: any; // WalletClient from wagmi

//   // Network info
//   network: any; // Network from wagmi
//   isOnCorrectNetwork: boolean;

//   // Balance info
//   balance: string | null;
//   balanceIsLoading: boolean;
//   balanceError: Error | null;

//   // Connection functions
//   connect: () => Promise<void>;
//   disconnect: () => void;

//   // Network functions
//   switchToCoston2: () => Promise<any>;

//   // Address book
//   addressBook: ReturnType<typeof useAddressBook>;

//   // Wallet-specific actions
//   isMetaMask: boolean;
//   isWalletConnect: boolean;
//   isCoinbaseWallet: boolean;
// };

// export default function useWallet(): EnhancedWalletHook {
//   // Basic wagmi hooks
//   const { data: account, isConnected, isConnecting } = useAccount();
//   const { connect, connectAsync } = useConnect();
//   const { disconnect } = useDisconnect();
//   const { data: network, isLoading: networkLoading } = useNetwork();
//   const { data: walletClient } = useWalletClient();
//   const provider = useProvider();

//   // Enhanced hooks
//   const balanceCache = useBalanceCache();
//   const addressBook = useAddressBook();
//   const networkSwitcher = useNetworkSwitcher();

//   // Wallet name and type detection
//   const [walletName, setWalletName] = useState<string | null>(null);
//   const [isMetaMask, setIsMetaMask] = useState<boolean>(false);
//   const [isWalletConnect, setIsWalletConnect] = useState<boolean>(false);
//   const [isCoinbaseWallet, setIsCoinbaseWallet] = useState<boolean>(false);

//   // Network status
//   const isOnCorrectNetwork = network?.chainId === coston2.id;

//   // Update wallet info when connected
//   useEffect(() => {
//     if (account) {
//       // Detect wallet type based on provider or window objects
//       // This is a simplified detection - in practice you might want more sophisticated detection
//       const eth = (window as any).ethereum;

//       let detectedName = "Unknown Wallet";
//       let isMM = false;
//       let isWC = false;
//       let isCB = false;

//       if (eth) {
//         // Check for MetaMask
//         if (eth.isMetaMask) {
//           detectedName = "MetaMask";
//           isMM = true;
//         }
//         // Check for WalletConnect (harder to detect directly)
//         // WalletConnect doesn't set obvious properties on ethereum object
//         // You might need to check window.WalletConnectProvider or similar
//         else if (eth.providers && eth.providers.length > 0) {
//           // This is a heuristic - not foolproof
//           detectedName = "WalletConnect";
//           isWC = true;
//         }
//         // Check for Coinbase Wallet
//         else if (eth.isCoinbaseWallet) {
//           detectedName = "Coinbase Wallet";
//           isCB = true;
//         }
//         // Fallback detection
//         else {
//           // Try to detect from user agent or other properties
//           const ua = navigator.userAgent.toLowerCase();
//           if (ua.includes('metamask')) {
//             detectedName = "MetaMask";
//             isMM = true;
//           } else if (ua.includes('coinbase')) {
//             detectedName = "Coinbase Wallet";
//             isCB = true;
//           } else {
//             detectedName = "Web3 Wallet";
//           }
//         }
//       }

//       setWalletName(detectedName);
//       setIsMetaMask(isMM);
//       setIsWalletConnect(isWC);
//       setIsCoinbaseWallet(isCB);
//     } else {
//       setWalletName(null);
//       setIsMetaMask(false);
//       setIsWalletConnect(false);
//       setIsCoinbaseWallet(false);
//     }
//   }, [account]);

//   // Connect function with enhanced error handling
//   const handleConnect = useCallback(async () => {
//     try {
//       await connectAsync();
//     } catch (error) {
//       console.error("Failed to connect wallet:", error);
//       throw error;
//     }
//   }, [connectAsync]);

//   // Disconnect function
//   const handleDisconnect = useCallback(() => {
//     disconnect();
//     setWalletName(null);
//     setIsMetaMask(false);
//     setIsWalletConnect(false);
//     setIsCoinbaseWallet(false);
//   }, [disconnect]);

//   // Switch to Coston2 network
//   const switchNetwork = useCallback(async () => {
//     return await networkSwitcher.switchToCoston2();
//   }, [networkSwitcher]);

//   return {
//     // Basic connection info
//     account,
//     isConnected,
//     isConnecting,

//     // Wallet details
//     walletName,
//     walletClient,

//     // Network info
//     network,
//     isOnCorrectNetwork,

//     // Balance info
//     balance: balanceCache.formattedBalance,
//     balanceIsLoading: balanceCache.isLoading,
//     balanceError: balanceCache.error,

//     // Connection functions
//     connect: handleConnect,
//     disconnect: handleDisconnect,

//     // Network functions
//     switchToCoston2: switchNetwork,

//     // Address book
//     addressBook,

//     // Wallet detection
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
    account: address || null,
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