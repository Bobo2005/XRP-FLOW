import { ShieldCheck, Sparkles } from "lucide-react";
import ConnectWallet from "./ConnectWallet";
import FlowLine from "./FlowLine";

/**
 * Landing page hero: headline, subcopy, primary CTA, and trust badges on
 * the left; a static (non-interactive) preview of the dashboard on the
 * right, giving a visitor a preview of what connecting a wallet leads to.
 */
export default function LandingHero() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 py-16 lg:grid-cols-2 lg:py-24">
      {/* Left: headline, subcopy, CTA, trust badges */}
      <div>
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-5xl">
          One-click XRP,{" "}
          <span className="text-primary-blue">best FXRP yield</span>,
          auto-managed
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-text-muted">
          Compare live FXRP rates across Kinetic and Morpho, deposit once,
          and build an on-chain reputation that unlocks better terms over
          time — no more manually tracking multiple protocols.
        </p>

        <div className="mt-8">
          <ConnectWallet variant="primary" />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-muted">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Non-custodial
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-muted">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Built on Flare
          </span>
        </div>
      </div>

      {/* Right: static dashboard preview mockup */}
      <div
        aria-hidden
        className="pointer-events-none select-none rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-6"
      >
        <div className="rounded-xl border border-border bg-bg-base p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-muted">
              Total Deposited
            </p>
            <span className="rounded-full bg-primary-blue/10 px-2 py-0.5 text-[10px] font-semibold text-primary-blue">
              Coston2
            </span>
          </div>
          <p className="num mt-1 text-2xl font-bold text-text-primary">
            1,250.42 FXRP
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-bg-surface p-3">
              <p className="text-[10px] text-text-muted">Best APY</p>
              <p className="num text-sm font-semibold text-success-green">
                4.82%
              </p>
            </div>
            <div className="rounded-lg bg-bg-surface p-3">
              <p className="text-[10px] text-text-muted">Est. Annual Yield</p>
              <p className="num text-sm font-semibold text-text-primary">
                60.27 FXRP
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-text-muted">
                Reputation
              </p>
              <span className="text-xs font-semibold text-tier-silver">
                Silver
              </span>
            </div>
            <div className="mt-2">
              <FlowLine progress={62} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}