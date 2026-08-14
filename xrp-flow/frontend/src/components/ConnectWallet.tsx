import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";
import { Wallet, Loader2 } from "lucide-react";
import { coston2 } from "../wagmi";

interface ConnectWalletProps {
  variant?: "primary" | "ghost";
  className?: string;
}

export default function ConnectWallet({
  variant = "primary",
  className = "",
}: ConnectWalletProps) {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending, error } = useConnect();
  const {
    switchChain,
    isPending: isSwitchPending,
    error: switchError,
  } = useSwitchChain();
  const onWrongNetwork = isConnected && chainId !== coston2.id;

  useEffect(() => {
    if (isConnected && !onWrongNetwork) navigate("/dashboard");
  }, [isConnected, navigate, onWrongNetwork]);

  const handleClick = () => {
    if (onWrongNetwork) {
      switchChain({ chainId: coston2.id });
      return;
    }
    const connector = connectors[0];
    if (connector) connect({ connector });
  };

  const base =
    "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-primary-blue text-white hover:bg-primary-blue-dark"
      : "border border-border bg-bg-base text-text-primary hover:bg-bg-surface";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || isSwitchPending}
        className={`${base} ${styles} ${className}`}
      >
        {isPending || isSwitchPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Wallet className="h-4 w-4" aria-hidden />
        )}
        {isSwitchPending
          ? "Switching network..."
          : isPending
            ? "Connecting..."
            : onWrongNetwork
              ? "Switch to Coston2"
              : "Connect Wallet"}
      </button>
      {onWrongNetwork && (
        <p className="max-w-xs text-xs text-danger-red">
          Your wallet is on another network. Switch to Flare Coston2 (chain ID
          114) to use XRP Flow.
        </p>
      )}
      {(error || switchError) && (
        <p className="text-xs text-danger-red">
          {switchError
            ? `Couldn't switch network: ${switchError.message}`
            : `Couldn't connect: ${error?.message}`}
        </p>
      )}
    </div>
  );
}
