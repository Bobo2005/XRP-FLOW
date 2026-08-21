# XRP Flow: One-click XRP → best FXRP yield, auto-managed, with an on-chain reputation layer

## Overview

XRP Flow is a DeFi yield optimizer built for the Flare Summer Signal hackathon (Bounty 1: Interoperable Asset Products). The protocol solves a key problem for XRP holders on Flare: manually checking multiple lending protocols (Kinetic, Morpho/Mystic, Upshift, etc.) to find the best yield, then moving funds manually when rates change. XRP Flow automates this process while adding an innovative on-chain reputation layer that rewards long-term, reliable depositors with progressively better terms.

## Core Innovation

Unlike traditional lending platforms that treat all wallets identically, XRP Flow builds an on-chain reputation score for each user based on:
- **Deposit size** (amount of FXRP deposited)
- **Duration held** (how long capital remains continuously deposited)
- **Consistency** (maintaining positions over time)

This reputation score unlocks Bronze, Silver, and Gold tiers, each offering progressively better yield boosts, creating a loyal user base and reducing churn.

## How It Works

### 1. Smart Contract Core (`YieldRouter.sol`)
The main contract implements:
- **Auto-routing**: On first deposit, funds go to whichever venue (Kinetic or Morpho) currently offers better rates
- **Position locking**: Once deposited, a user's full position stays in the chosen venue until they withdraw to zero (even if the other venue's rate later overtakes it)
- **Reputation tracking**: On-chain scoring mechanism that calculates `score = amount held (wei) × days held`
- **Tier system**: Four reputation tiers (None, Bronze, Silver, Gold) with owner-tunable thresholds
- **Yield boosting**: Reputation-based yield increases applied off-chain when calculating displayed APY
- **Decay mechanism**: Inactive users experience gradual reputation decay to prevent permanent tier locking

### 2. Venue Integration
The protocol integrates with two lending venues on Flare:
- **Kinetic Market**: A Compound v2 fork money market
- **Morpho Blue**: Modular lending protocol that launched on Flare in February 2026

*Note: For Coston2 testing, mock contracts replicate the real mainnet ABIs exactly.*

### 3. User Flow
1. User connects wallet and approves XRP Flow to spend their FXRP
2. User calls `deposit(amount)` - tokens are pulled from their wallet
3. On first deposit: Contract checks live rates (via mocks/testnet) and routes to best venue
4. On subsequent deposits: User stays in same venue (preserves reputation clock)
5. User can manually rebalance via `rebalance()` if rates change significantly
6. User can withdraw anytime via `withdraw(amount)`
7. Reputation score updates continuously and can be checked via `getReputationTier()`

## Technical Architecture

### Smart Contracts
- **YieldRouter.sol**: Main contract handling routing, deposits, withdrawals, and reputation
- **Interfaces**: `IKinetic.sol` and `IMorpho.sol` matching real protocol ABIs
- **Mocks**: `MockKinetic.sol`, `MockMorpho.sol`, `MockFXRP.sol` for testing
- **Security Test**: `MaliciousKinetic.sol` - dedicated reentrancy attack mock

### Frontend Stack
- **Framework**: React + TypeScript + Vite
- **Web3**: wagmi + viem for wallet interactions
- **Styling**: Tailwind CSS (inferred from common patterns)
- **State Management**: React hooks/context

### Development Tools
- **Compile/Test**: Hardhat with ethers.js
- **Network**: Flare Coston2 testnet
- **Dependencies**: OpenZeppelin Contracts (access control, reentrancy guards, ERC20 utilities, enumerable sets)

## Key Features

### 1. One-Click Yield Optimization
- Users deposit FXRP once and the contract automatically selects the best-yielding venue
- Eliminates need for manual rate checking and fund transfers between protocols

### 2. On-Chain Reputation Layer
- **Scoring**: `score = amount (wei) × days held`
- **Tiers**: 
  - None: Score < bronzeThreshold
  - Bronze: Score ≥ bronzeThreshold (e.g. 100 FXRP for 7 days)
  - Silver: Score ≥ silverThreshold (e.g. 500 FXRP for 30 days)
  - Gold: Score ≥ goldThreshold (e.g. 2000 FXRP for 90 days)
- **Benefits**: Higher tiers unlock yield boost percentages (e.g. +0.1%, +0.25%, +0.5%)
- **Persistence**: Reputation score survives partial withdrawals (timestamp preserved)
- **Decay**: Inactive users lose reputation gradually to maintain system fairness

### 3. Gas-Efficient Design
- Uses `EnumerableSet` for efficient leaderboard computations
- Stores only essential data (deposit amount/timestamp, venue assignment)
- Bubble sort for leaderboard (acceptable for expected user counts)
- Minimal storage writes (updates only when reputation changes significantly)

### 4. Security Measures
- **Reentrancy Protection**: `nonReentrant` modifier on all external functions
- **Access Control**: `Ownable` for admin functions (set thresholds, boost factors, etc.)
- **Immutable Addresses**: Protocol addresses set at constructor and cannot be changed
- **Check-Effects-Interactions**: Planned improvement (currently load-bearing on reentrancy guard)
- **ERC20 Safety**: Uses OpenZeppelin's standard ERC20 interface (recommend SafeERC20 for mainnet)
- **Emergency Pause**: Planned addition (Pausable on deposit() only)

### 5. Comprehensive Testing
- **Unit Tests**: Covering deposits, withdrawals, reputation calculations, tier upgrades
- **Reentrancy Tests**: Using dedicated `MaliciousKinetic` mock
- **Access Control Tests**: Verifying onlyOwner restrictions
- **Edge Cases**: Zero amounts, insufficient funds, timestamp handling
- **Snapshot Verification**: Ensuring reputation history is recorded correctly

## Contract Details

### State Variables
- **Protocol Interfaces**: `fxrp`, `kinetic`, `morpho` (immutable)
- **Morpho Configuration**: `morphoMarketParams` (set once only)
- **User Tracking**: 
  - `deposits`: Mapping of user → {amount, timestamp}
  - `userVenue`: Mapping of user → current venue (Kinetic/Morpho)
  - `lastActivityTimestamp`: For decay calculation
- **Reputation System**:
  - `usersWithReputation`: EnumerableSet of users with score > 0
  - `latestReputationScore`: Caching for leaderboard efficiency
  - `userTier`: Current tier per user
  - `reputationHistory`: Array of snapshots per user
- **Configurable Parameters**:
  - Thresholds: `bronzeThreshold`, `silverThreshold`, `goldThreshold` (wei × days)
  - Boost Factors: `bronzeBoost`, `silverBoost`, `goldBoost` (scaled by 1e4)
  - Decay Rate: `decayRatePerDay` (scaled by 1e18)
  - Mock APYs: `kineticMockAPY`, `morphoMockAPY` (for testing)

### Events
- `Deposited`, `Withdrawn`: Track user fund movements
- `MockAPYUpdated`: When owner changes placeholder rates
- `MorphoMarketParamsUpdated`: When Morpho market is configured
- `ThresholdsUpdated`, `BoostFactorsUpdated`, `DecayRateUpdated`: Admin changes
- `Rebalanced`: When user moves funds between venues
- `RoutingUpdated`: When Morpho routing is enabled/disabled
- `UserRoutingUpdated`: Legacy routing preference tracking
- `ReputationSnapshotUpdated`: When reputation data is recorded
- `ReputationTierAchieved`: When user reaches a new tier
- `Rebalanced`: When user manually rebalances

### Errors
- Custom error types for gas efficiency:
  - `ZeroAmount()`
  - `InsufficientDeposit(requested, available)`
  - `KineticCallFailed(errorCode)`
  - `MorphoMarketNotConfigured()`
  - `MorphoMarketAlreadyConfigured()`
  - `VenueMismatch(existing, requested)`
  - `NoRebalanceNeeded()`

### Admin Functions (owner-only)
- `setMockAPY(venue, newAPY)`: Update placeholder rates
- `setMorphoMarketParams(params)`: Configure Morpho market (callable once)
- `setThresholds(bronze, silver, gold)`: Adjust reputation requirements
- `setBoostFactors(bronze, silver, gold)`: Modify yield boost percentages
- `setDecayRate(newDecayRate)`: Change reputation decay speed

### View Functions
- `getReputationTier(user)`: Compute current tier for any address
- `getCurrentAPY(user)`: Get boosted APY for user (defaults to msg.sender)
- `getBestVenue()`: See which venue currently has better mock rate
- `getReputationHistory(user)`: Get user's reputation snapshot history
- `getTopUsersByReputation(limit)`: Leaderboard of top users by score

### Core Transaction Functions
- `deposit(amount)`: Auto-route to best venue
- `depositToVenue(amount, venue)`: Manually choose venue (with restrictions)
- `withdraw(amount)`: Withdraw from current venue
- `rebalance()`: Move funds to better venue (gas-optimized)

## Security Considerations

### Identified Issues (from SECURITY.md)
1. **Morpho market params orphan risk** (FIXED): Made `setMorphoMarketParams()` callable only once to prevent withdrawing to wrong market after config change
2. **Checks-effects-interactions ordering**: External calls happen before state updates (mitigated by nonReentrant guard, recommended to reorder)
3. **Owner rate manipulation**: Owner can front-run deposits via `setMockAPY()` (recommended timelock/multisig for mainnet)
4. **Unchecked ERC20 return values**: Using basic ERC20 instead of SafeERC20 (recommended upgrade)
5. **Mocks don't move tokens**: Custody risk untested (need token-moving mocks for proper testing)
6. **No emergency pause**: Consider OpenZeppelin's Pausable
7. **No deposit caps**: Consider TVL limits for initial launch

### Strengths
- **Reentrancy protection**: Properly tested with malicious mock
- **Access control**: All admin functions are onlyOwner with success/revert tests
- **Integer safety**: Solidity 0.8 overflow checks cover reputation calculations
- **Address immutability**: Protocol addresses cannot be swapped post-deployment

## Deployment & Setup

### Prerequisites
- Node.js >= 16
- Hardhat
- Flare Coston2 testnet RPC URL
- Private key with testnet FLRA/XRP

### Installation
```bash
git clone <repository-url>
cd xrp-flow
npm install
cp .env.example .env   # Add PRIVATE_KEY and COSTON2_RPC_URL
npx hardhat compile
npx hardhat test
```

### Deployment to Coston2
```bash
npx hardhat run scripts/deploy.ts --network coston2
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## Contract Addresses (Coston2 Testnet)
*To be filled after deployment:*
- YieldRouter: `0x...`
- MockFXRP: `0x...` 
- MockKinetic: `0x...`
- MockMorpho: `0x...`

## Roadmap

### Immediate Next Steps
1. Deploy to Flare Mainnet using verified real addresses:
   - Kinetic ISO FXRP market: Unitroller `0x15F69897E6aEBE0463401345543C26d1Fd994abB`, cToken `0xD1b7A5eFa9bd88F291F7A4563a8f6185c0249CB3`
   - Morpho Blue: `0xF4346F5132e810f80a28487a79c7559d9797E8B0`
2. Add Firelight and Upshift as additional routing venues
3. Extend reputation layer into undercollateralized lending across Flare ecosystem
4. Fully automate native XRP → FXRP minting (currently guided flow)

### Long-Term Vision
- Become the default yield aggregator for FXRP on Flare
- Expand to other Flare-native assets beyond FXRP
- Develop governance mechanism for community-controlled parameter tuning
- Integrate with Flare's FTSO system for more reliable price data
- Create mobile wallet integration for seamless user experience

## Why XRP Flow Matters

For the average XRP holder on Flare, managing yield across multiple protocols is complex, time-consuming, and often results in suboptimal returns due to inertia or lack of information. XRP Flow solves this by:

1. **Democratizing access to best yields** - No need to constantly monitor multiple dashboards
2. **Rewarding loyalty** - Long-term users get progressively better treatment, encouraging healthy protocol engagement
3. **Reducing fragmentation** - Aggregates liquidity in a single, user-friendly interface
4. **Providing transparency** - All reputation calculations are on-chain and verifiable
5. **Enabling composability** - Reputation scores can potentially be used by other Flare protocols

By combining automated yield optimization with an innovative reputation system, XRP Flow creates a more efficient, fair, and engaging DeFi experience for Flare's growing ecosystem.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built for Flare Summer Signal hackathon
- Uses OpenZeppelin Contracts for security-critical implementations
- Inspired by yield aggregators like Yearn and Idle Finance
- Reputation system concepts influenced by loyalty programs and undercollateralized lending primitives