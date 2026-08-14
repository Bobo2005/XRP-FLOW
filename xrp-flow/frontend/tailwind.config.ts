import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-base": "#FFFFFF",
        "bg-surface": "#F8FAFC",
        border: "#E2E8F0",
        "primary-blue": "#2563EB",
        "primary-blue-dark": "#1D4ED8",
        "accent-teal": "#0EA5E9",
        "text-primary": "#0F172A",
        "text-muted": "#64748B",
        "success-green": "#16A34A",
        "danger-red": "#DC2626",
        "tier-bronze": "#CD7F32",
        "tier-silver": "#94A3B8",
        "tier-gold": "#F59E0B",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        "flow-pulse": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "flow-pulse": "flow-pulse 2.5s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;