import { ReactNode } from "react";

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  onClick,
  disabled = false,
  type = "button",
}: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md border border-transparent text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary: "bg-primary-blue text-white hover:bg-primary-blue-dark focus:ring-primary-blue",
    secondary: "bg-bg-surface text-text-primary hover:bg-bg-surface/80 focus:ring-text-primary",
    ghost: "bg-transparent text-text-primary hover:bg-bg-surface/50 focus:ring-text-primary",
    danger: "bg-danger-red text-white hover:bg-danger-red-dark focus:ring-danger-red",
  };

  const sizes: Record<string, string> = {
    sm: "h-9 px-3",
    md: "h-10 px-4",
    lg: "h-11 px-6",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}