import { ReactNode } from "react";

interface InputProps {
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

export function Input({
  type = "text",
  value,
  onChange,
  placeholder = "",
  className = "",
  disabled = false,
  required = false,
  autoFocus = false,
}: InputProps) {
  const base = "block w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm ring-1 ring-inset ring-text-muted/30 placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${base} ${className}`}
      disabled={disabled}
      required={required}
      autoFocus={autoFocus}
    />
  );
}