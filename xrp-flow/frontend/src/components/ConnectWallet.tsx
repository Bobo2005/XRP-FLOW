// import { useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { useWallet } from "../hooks/useWallet";
// import { Wallet, Loader2, Monitor, Smartphone, MessageSquare } from "lucide-react";

// interface ConnectWalletProps {
//   variant?: "primary" | "ghost";
//   className?: string;
//   showDetails?: boolean;
// }

// export default function ConnectWallet({
//   variant = "primary",
//   className = "",
//   showDetails = false,
// }: ConnectWalletProps) {
//   const navigate = useNavigate();
//   const wallet = useWallet();

//   useEffect(() => {
//     if (wallet.account && wallet.isOnCorrectNetwork) {
//       navigate("/dashboard");
//     }
//   }, [wallet.account, wallet.isOnCorrectNetwork, navigate]);

//   const handleConnect = async () => {
//     try {
//       await wallet.connect();
//     } catch (error) {
//       console.error("Connection error:", error);
//       // Error is handled by the hook and displayed in UI
//     }
//   };

//   const handleNetworkSwitch = async () => {
//     try {
//       await wallet.switchToCoston2();
//     } catch (error) {
//       console.error("Network switch error:", error);
//       // Error is handled by the hook and displayed in UI
//     }
//   };

//   const base =
//     "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
//   const styles =
//     variant === "primary"
//       ? "bg-primary-blue text-white hover:bg-primary-blue-dark"
//       : "border border-border bg-bg-base text-text-primary hover:bg-bg-surface";

//   // Determine wallet icon based on detected wallet type
//   const getWalletIcon = () => {
//     if (wallet.isMetaMask) return <Wallet className="h-4 w-4" aria-hidden />;
//     if (wallet.isWalletConnect) return (
//       <Monitor className="h-4 w-4" aria-hidden />
//     );
//     if (wallet.isCoinbaseWallet) return (
//       <MessageSquare className="h-4 w-4" aria-hidden />
//     );
//     return <Smartphone className="h-4 w-4" aria-hidden />;
//   };

//   return (
//     <div className="flex flex-col items-start gap-1.5">
//       <button
//         type="button"
//         onClick={handleConnect}
//         disabled={wallet.isConnecting}
//         className={`${base} ${styles} ${className}`}
//       >
//         {wallet.isConnecting ? (
//           <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
//         ) : (
//           getWalletIcon()
//         )}
//         {!wallet.account
//           ? "Connect Wallet"
//           : !wallet.isOnCorrectNetwork
//             ? "Switch to Coston2"
//             : wallet.account
//               ? `${wallet.walletName || "Connected"} • ${wallet.account
//                   .slice(0, 6)
//                   .concat("...")
//                   .concat(wallet.account.slice(-4))}`
//               : "Connect Wallet"}
//       </button>
//       {showDetails && wallet.account && !wallet.isOnCorrectNetwork && (
//         <p className="max-w-xs text-xs text-danger-red">
//           Your wallet is on another network. Switch to Flare Coston2 (chain ID
//           114) to use XRP Flow.
//         </p>
//       )}
//       {showDetails && (
//         <>
//           {(wallet.balanceError || wallet.balanceIsLoading) && (
//             <p className="text-xs text-danger-red">
//               {wallet.balanceError
//                 ? `Balance error: ${wallet.balanceError.message}`
//                 : "Loading balance..."}
//             </p>
//           )}
//           {!wallet.balanceError && !wallet.balanceIsLoading && wallet.balance !== null && (
//             <p className="text-xs text-text-muted">
//               Balance: {wallet.balance} FXRP
//             </p>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { Wallet, Loader2, Monitor, Smartphone, MessageSquare } from "lucide-react";

interface ConnectWalletProps {
  variant?: "primary" | "ghost";
  className?: string;
  showDetails?: boolean;
}

export default function ConnectWallet({
  variant = "primary",
  className = "",
  showDetails = false,
}: ConnectWalletProps) {
  const navigate = useNavigate();
  const wallet = useWallet();

  useEffect(() => {
    if (wallet.account && wallet.isOnCorrectNetwork) {
      navigate("/dashboard");
    }
  }, [wallet.account, wallet.isOnCorrectNetwork, navigate]);

  const handleConnect = async () => {
    try {
      await wallet.connect();
    } catch (error) {
      console.error("Connection error:", error);
      // Error is handled by the hook and displayed in UI
    }
  };

  const base =
    "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-primary-blue text-white hover:bg-primary-blue-dark"
      : "border border-border bg-bg-base text-text-primary hover:bg-bg-surface";

  // Determine wallet icon based on detected wallet type
  const getWalletIcon = () => {
    if (wallet.isMetaMask) return <Wallet className="h-4 w-4" aria-hidden />;
    if (wallet.isWalletConnect) return (
      <Monitor className="h-4 w-4" aria-hidden />
    );
    if (wallet.isCoinbaseWallet) return (
      <MessageSquare className="h-4 w-4" aria-hidden />
    );
    return <Smartphone className="h-4 w-4" aria-hidden />;
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleConnect}
        disabled={wallet.isConnecting}
        className={`${base} ${styles} ${className}`}
      >
        {wallet.isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          getWalletIcon()
        )}
        {!wallet.account
          ? "Connect Wallet"
          : !wallet.isOnCorrectNetwork
            ? "Switch to Coston2"
            : wallet.account
              ? `${wallet.walletName || "Connected"} • ${wallet.account
                  .slice(0, 6)
                  .concat("...")
                  .concat(wallet.account.slice(-4))}`
              : "Connect Wallet"}
      </button>
      {showDetails && wallet.account && !wallet.isOnCorrectNetwork && (
        <p className="max-w-xs text-xs text-danger-red">
          Your wallet is on another network. Switch to Flare Coston2 (chain ID
          114) to use XRP Flow.
        </p>
      )}
      {showDetails && (
        <>
          {(wallet.balanceError || wallet.balanceIsLoading) && (
            <p className="text-xs text-danger-red">
              {wallet.balanceError
                ? `Balance error: ${wallet.balanceError.message}`
                : "Loading balance..."}
            </p>
          )}
          {!wallet.balanceError && !wallet.balanceIsLoading && wallet.balance !== null && (
            <p className="text-xs text-text-muted">
              Balance: {wallet.balance} FXRP
            </p>
          )}
        </>
      )}
    </div>
  );
}