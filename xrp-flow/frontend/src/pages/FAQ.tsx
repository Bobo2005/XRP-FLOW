import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import ConnectWallet from "../components/ConnectWallet";

const FAQS = [
  ["What is XRP Flow?", "XRP Flow is a non-custodial interface for depositing FXRP through a YieldRouter into Kinetic or Morpho on Flare Coston2."],
  ["What network do I need?", "Use Flare Coston2, chain ID 114. The wallet connection flow can prompt you to switch networks when your wallet is on another chain."],
  ["Does XRP Flow hold my funds?", "No. Your wallet signs approvals and transactions directly. The router contract receives and routes the FXRP position."],
  ["How is the venue selected?", "You can choose Kinetic or Morpho for a new position. The dashboard also shows the current best mock rate. Once a position exists, top-ups remain in that original venue."],
  ["How do reputation tiers work?", "The contract scores the amount held multiplied by complete days held. It evaluates against the Bronze, Silver, and Gold thresholds and returns the corresponding tier."],
  ["Can I withdraw at any time?", "Yes, subject to the position and venue contract state. A full withdrawal clears the position timestamp, so a later deposit starts a fresh reputation clock."],
  ["Why do I need two wallet confirmations?", "The first confirmation approves the router to transfer FXRP. The second submits the actual deposit or withdrawal transaction."],
  ["Is this mainnet?", "No. The current deployment is a testnet build on Flare Coston2. Do not use assets you cannot afford to test with."],
] as const;

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-border"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><Link to="/" className="font-display text-lg font-extrabold text-text-primary">XRP Flow</Link><nav className="flex items-center gap-5 text-sm font-medium"><Link to="/how-it-works" className="text-text-muted hover:text-text-primary">How it works</Link><Link to="/faq" className="text-primary-blue">FAQ</Link></nav><ConnectWallet variant="ghost" /></div></header>
      <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">Questions, answered</p><h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">FAQ</h1><p className="mt-5 text-lg leading-relaxed text-text-muted">The important details before you connect a wallet or make a testnet deposit.</p><div className="mt-10 divide-y divide-border rounded-xl border border-border bg-bg-surface">{FAQS.map(([question, answer], index) => { const isOpen = open === index; return <div key={question}><button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : index)} className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left"><span className="font-display text-base font-bold text-text-primary">{question}</span><ChevronDown className={`h-5 w-5 shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden /></button>{isOpen && <p className="px-5 pb-5 pr-14 text-sm leading-relaxed text-text-muted">{answer}</p>}</div>; })}</div></main>
    </div>
  );
}
