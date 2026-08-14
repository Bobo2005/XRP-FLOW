import { ArrowRight, CircleDollarSign, GitCompareArrows, ShieldCheck, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import ConnectWallet from "../components/ConnectWallet";

const STEPS = [
  { icon: Wallet, title: "Connect your wallet", body: "Connect an injected wallet and switch to Flare Coston2. XRP Flow never takes custody of your assets." },
  { icon: GitCompareArrows, title: "Choose a venue", body: "Compare the current Kinetic and Morpho rates, then choose where your FXRP position should start." },
  { icon: CircleDollarSign, title: "Approve and deposit", body: "Approve the YieldRouter to move FXRP, then submit one deposit transaction. Your position stays in its chosen venue." },
  { icon: ShieldCheck, title: "Build reputation", body: "Your amount and continuous holding time contribute to an on-chain tier: None, Bronze, Silver, or Gold." },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg font-extrabold text-text-primary">XRP Flow</Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link to="/how-it-works" className="text-primary-blue">How it works</Link>
            <Link to="/faq" className="text-text-muted hover:text-text-primary">FAQ</Link>
          </nav>
          <ConnectWallet variant="ghost" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">The flow</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">From FXRP to a working position.</h1>
          <p className="mt-5 text-lg leading-relaxed text-text-muted">XRP Flow makes the operational steps visible, while the YieldRouter keeps the position and reputation rules on-chain.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <article key={title} className="relative rounded-xl border border-border bg-bg-surface p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-blue/10 text-primary-blue"><Icon className="h-5 w-5" aria-hidden /></div>
                <div><p className="text-xs font-semibold text-primary-blue">0{index + 1}</p><h2 className="mt-1 font-display text-xl font-bold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p></div>
              </div>
            </article>
          ))}
        </div>
        <section className="mt-12 border-y border-border py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-display text-2xl font-bold">Ready to see your position?</h2><p className="mt-1 text-sm text-text-muted">Connect on Coston2 and start with a small amount.</p></div>
            <ConnectWallet variant="primary" />
          </div>
        </section>
        <Link to="/faq" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary-blue hover:text-primary-blue-dark">Read the FAQ <ArrowRight className="h-4 w-4" aria-hidden /></Link>
      </main>
    </div>
  );
}


