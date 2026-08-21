// import { useWalletClient, useAccount, useConnect, useDisconnect, useNetwork } from "wagmi";
// import { useAccount, useSwitchChain, useChainId } from "wagmi";
// import { useEffect, useState, useCallback } from "react";
// import { coston2 } from '../../wagmi';

// export function useWalletConnection() {
//   const { data: account, isConnected, isConnecting } = useAccount();
//   const { connect, connectAsync } = useConnect();
//   const { disconnect } = useDisconnect();
//   const { data: network, isLoading: networkLoading } = useNetwork();
//   const { data: walletClient } = useWalletClient();

//   const [walletName, setWalletName] = useState<string | null>(null);
//   const [isWalletReady, setIsWalletReady] = useState(false);

//   // Check if connected to correct network
//   const isOnCorrectNetwork = network?.chainId === coston2.id;

//   // Handle wallet connection
//   const handleConnect = useCallback(async () => {
//     try {
//       await connectAsync();
//     } catch (error) {
//       console.error("Failed to connect wallet:", error);
//       throw error;
//     }
//   }, [connectAsync]);

//   // Handle wallet disconnection
//   const handleDisconnect = useCallback(() => {
//     disconnect();
//     setWalletName(null);
//     setIsWalletReady(false);
//   }, [disconnect]);

//   // Update wallet name when connected
//   useEffect(() => {
//     if (account) {
//       // In a real implementation, we would determine wallet name from provider
//       // For now, we'll set a placeholder
//       setWalletName("Connected Wallet");
//       setIsWalletReady(true);
//     } else {
//       setWalletName(null);
//       setIsWalletReady(false);
//     }
//   }, [account]);

//   return {
//     account,
//     isConnected,
//     isConnecting,
//     walletName,
//     isWalletReady,
//     network,
//     isOnCorrectNetwork,
//     connect: handleConnect,
//     disconnect: handleDisconnect,
//     walletClient,
//   };
// }

// // Custom hook for network auto-switching
// export function useNetworkSwitcher() {
//   const { data: network } = useNetwork();
//   const { switchNetwork } = useConnect(); // Using connect for switchNetwork capability

//   const switchToCoston2 = useCallback(async () => {
//     if (network?.chainId !== coston2.id) {
//       try {
//         // In wagmi v2, network switching is handled differently
//         // This would typically involve requesting the user to switch networks
//         // For now, we'll return the target chain info
//         return coston2;
//       } catch (error) {
//         console.error("Failed to switch network:", error);
//         throw error;
//       }
//     }
//     return network;
//   }, [network]);

//   return {
//     switchToCoston2,
//     currentNetwork: network,
//   };
// }

import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useWalletClient, 
  useSwitchChain, 
  useChainId 
} from "wagmi";
import { useCallback } from "react";
import { coston2 } from "../../wagmi";

export function useWalletConnection() {
  // 1. Destructure directly from useAccount (wagmi v2 format)
  const { address, isConnected, isConnecting, chain, connector } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  // 2. Derive state directly without needing useState / useEffect
  const walletName = connector?.name || null;
  const isWalletReady = isConnected && !!address;
  const isOnCorrectNetwork = chain?.id === coston2.id;

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    try {
      // Pass the target connector (defaults to injected/MetaMask if available)
      const targetConnector = connectors[0];
      if (targetConnector) {
        await connectAsync({ connector: targetConnector });
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }, [connectAsync, connectors]);

  // Handle wallet disconnection
  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    account: address,
    isConnected,
    isConnecting,
    walletName,
    isWalletReady,
    network: chain,
    isOnCorrectNetwork,
    connect: handleConnect,
    disconnect: handleDisconnect,
    walletClient,
  };
}

// Custom hook for network auto-switching
export function useNetworkSwitcher() {
  const chainId = useChainId();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const switchToCoston2 = useCallback(async () => {
    if (chainId !== coston2.id) {
      try {
        await switchChainAsync({ chainId: coston2.id });
        return coston2;
      } catch (error) {
        console.error("Failed to switch network:", error);
        throw error;
      }
    }
    return chain;
  }, [chainId, chain, switchChainAsync]);

  return {
    switchToCoston2,
    currentNetwork: chain,
  };
}