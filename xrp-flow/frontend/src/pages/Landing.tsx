import { Link } from "react-router-dom";
import LandingHero from "../components/LandingHero";
import FeatureGrid from "../components/FeatureGrid";
import ConnectWallet from "../components/ConnectWallet";

const NAV_LINKS = [
  { label: "Product", to: "/" },
  { label: "How it works", to: "/how-it-works" },
  { label: "FAQ", to: "/faq" },
];
const COMPOSABLE_WITH = ["Kinetic", "Morpho", "FTSO"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Nav bar */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-display text-lg font-extrabold text-text-primary"
          >
            XRP Flow
          </Link>

          <nav className="hidden gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <ConnectWallet variant="ghost" />
        </div>
      </header>

      <main>
        <LandingHero />

        {/* Trust strip */}
        <section className="border-y border-border bg-bg-surface py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Composable with
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
              {COMPOSABLE_WITH.map((name) => (
                <span
                  key={name}
                  className="font-display text-base font-bold text-text-muted"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <FeatureGrid />
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-xs text-text-muted">
          Built for the Flare Summer Signal hackathon — Bounty 1:
          Interoperable Asset Products. Deployed on Flare Coston2 testnet.
        </div>
      </footer>
    </div>
  );
}

