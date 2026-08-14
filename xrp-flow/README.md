# XRP Flow

One-click XRP → best FXRP yield, auto-managed, with an on-chain reputation layer that rewards loyal users.

Built for the Flare Summer Signal hackathon — Bounty 1: Interoperable Asset Products.

## The problem

XRP holders who want yield on Flare currently have to check Kinetic, Morpho/Mystic, Upshift, and other protocols separately to find the best rate, then move funds manually if a better rate appears elsewhere. None of these protocols recognize or reward long-term, reliable depositors — every wallet is treated the same.

## What it does

- **Compare** — live APY across Kinetic and Morpho/Mystic in one dashboard
- **Deposit once** — FXRP routes into the best-performing protocol
- **Build reputation** — an on-chain score tracks deposit size and duration, unlocking Bronze/Silver/Gold tiers with better terms over time

## Target user

XRP holders who want yield on Flare without manually tracking multiple DeFi protocols or navigating FAssets mechanics themselves.

## Tech stack

- Solidity contracts (Hardhat, OpenZeppelin) — deployed on Flare Coston2
- React + TypeScript + Vite frontend, wagmi/viem for wallet connection
- Mock Kinetic and Morpho contracts on Coston2, built to faithfully match each protocol's real mainnet interface

## A note on mocks vs. real protocols

This demo runs on **Flare Coston2 testnet** using mock Kinetic and Morpho contracts. Kinetic and Morpho do not currently have confirmed deployments on Coston2, so this project uses mocks that replicate their real mainnet ABIs exactly — meaning the integration logic is real, even though the underlying contracts on Coston2 are not.

We've identified and verified the real Flare Mainnet deployments directly from each protocol's official documentation:

- **Kinetic** ISO FXRP market — Unitroller: `0x15F69897E6aEBE0463401345543C26d1Fd994abB`, ISO FXRP cToken: `0xD1b7A5eFa9bd88F291F7A4563a8f6185c0249CB3`
- **Morpho Blue** — `0xF4346F5132e810f80a28487a79c7559d9797E8B0`

Because our interfaces already match these contracts' real function signatures, deploying to Mainnet is a configuration change, not a rewrite — this is the first item on the roadmap below.

## Setup

\`\`\`bash
git clone <repo>
cd xrp-flow
npm install
cp .env.example .env   # add your PRIVATE_KEY and COSTON2_RPC_URL
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network coston2

cd frontend
npm install
npm run dev
\`\`\`

## Deployed contracts (Coston2)

| Contract | Address |
|---|---|
| YieldRouter | `0x...` (fill in after deploy) |
| MockFXRP (testing only) | `0x...` |
| MockKinetic (testing only) | `0x...` |
| MockMorpho (testing only) | `0x...` |

## Security

See `SECURITY.md` for self-review notes. This project has not been audited. `MaliciousKinetic.sol` is included as a dedicated reentrancy-attack mock used in testing.

## Roadmap

- Deploy to Flare Mainnet using the verified, real Kinetic and Morpho addresses above — interfaces already match, so this is largely a configuration change, not a rewrite
- Add Firelight and Upshift as additional routing venues
- Extend the reputation layer into undercollateralized lending across the Flare ecosystem
- Fully automate native XRP → FXRP minting (currently a guided flow)