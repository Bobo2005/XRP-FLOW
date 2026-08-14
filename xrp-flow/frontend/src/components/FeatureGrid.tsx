import { BarChart3, Route, Award, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";

interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: BarChart3,
    title: "Compare Rates",
    description:
      "Live FXRP APY from Kinetic and Morpho, side by side in one dashboard — no more checking each protocol separately.",
  },
  {
    icon: Route,
    title: "Auto-Route",
    description:
      "Deposit once and your FXRP routes into the best-performing venue automatically.",
  },
  {
    icon: Award,
    title: "Build Reputation",
    description:
      "Every deposit builds an on-chain track record. Longer, larger deposits unlock Bronze, Silver, and Gold tiers.",
  },
  {
    icon: ShieldCheck,
    title: "Fully Non-Custodial",
    description:
      "Your FXRP stays in audited protocol contracts. XRP Flow never takes custody of your funds.",
  },
];

/** Four-card grid presenting XRP Flow's core capabilities on the landing page. */
export default function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-bg-base p-6"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-blue/10">
              <Icon className="h-5 w-5 text-primary-blue" />
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-text-primary">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}