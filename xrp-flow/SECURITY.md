# Security self-review — YieldRouter

**This is a self-review, not an audit.** It's one pass by the same people
who wrote the contract, done before any real funds touch it. It is not a
substitute for an independent audit, and shouldn't be treated as one —
see the recommendation at the bottom before any mainnet deployment.

Scope: `contracts/YieldRouter.sol` as of the multi-venue routing change.
Not in scope: `IKinetic.sol`/`IMorpho.sol` themselves (interfaces, no
logic to break), the mocks (test-only, not deployed to mainnet), or the
frontend.

## Findings

### 1. Fixed: Morpho market params could have orphaned depositors

`morphoMarketParams` is one global value, read fresh by both `deposit()`
and `withdraw()` — it isn't snapshotted per-user at deposit time. If the
owner had called `setMorphoMarketParams()` a second time after some users
already had funds routed to Morpho, those users' `withdraw()` calls would
have targeted the *new* market instead of the one their funds actually
went into. Depending on the real Morpho market's behavior, that likely
means a stuck withdrawal, not a fund-draining exploit — but it's a real
correctness bug, not just an edge case.

**Fixed** by making `setMorphoMarketParams()` callable exactly once
(`MorphoMarketAlreadyConfigured` on a second call). Trades away the
ability to ever change the Morpho market post-launch — deploying a new
router is the migration path — in exchange for removing this bug class
entirely. Worth reconsidering if the project needs to support changing
markets later; the fix then is a per-user snapshot, not a global value.

### 2. External calls happen before state updates

`deposit()` and `withdraw()` call out to `fxrp`, `kinetic`, and `morpho`
*before* updating `deposits[msg.sender]`. That's the opposite of the
checks-effects-interactions pattern, and would be exploitable if
`nonReentrant` were ever removed or bypassed — a reentrant call would see
stale state. Today it's safe because the guard is there and tested
(including an explicit attack-mock test), but the safety is entirely
load-bearing on that one guard rather than defense-in-depth. Worth
reordering to update state before the external calls, with the mocks
changed to move tokens for real so the ordering can be tested
meaningfully — currently the mocks don't move tokens at all, which is
exactly what let this ordering issue slide (see finding 5).

### 3. Owner can steer routing — real for a single EOA owner

`setMockAPY()` lets the owner change which venue looks best, and since
venue selection happens at deposit time, the owner can front-run a
pending deposit by changing the rate right before it lands, redirecting a
user's first deposit to a venue they didn't expect. `Ownable` here is a
single EOA with no timelock or multisig. Not exploitable by a third
party, but real if the owner key is compromised — the blast radius is
"misroutes future deposits," not "steals existing ones," since the owner
functions never touch user balances or move funds directly. Before
mainnet: move ownership to a multisig, and consider a timelock on
`setMockAPY`/`setMorphoMarketParams` so a compromised key can't
redirect deposits without warning.

### 4. Unchecked ERC20 return values

`fxrp.transferFrom(...)` and `fxrp.transfer(...)` are called directly
against `IERC20` without checking the boolean return value. Some
non-standard ERC20 tokens return `false` on failure instead of reverting,
which would silently continue as if the transfer succeeded. `MockFXRP`
(a standard OpenZeppelin `ERC20`) always reverts on failure, so this
isn't exploitable against what's deployed today — but the real FXRP
contract's exact behavior hasn't been independently verified against
this assumption. Recommend switching to OpenZeppelin's `SafeERC20`
(`safeTransferFrom`/`safeTransfer`) before pointing this at a real token,
regardless.

### 5. The mocks don't move tokens — so custody risk is untested

`MockKinetic`/`MockMorpho` do bookkeeping only; the router keeps 100%
custody of deposited FXRP itself right now (documented in both mocks'
NatSpec). That's actually the reason findings 2 and 4 aren't live risks
today. It also means none of the current tests exercise what happens if a
real venue integration reverts partway, is paused, or is insolvent at
withdrawal time. `_supplyToVenue`/`_withdrawFromVenue`'s error-code
checking (`KineticCallFailed`) is written but never actually triggered by
any test, since `MockKinetic.redeemUnderlying` reverts directly instead
of returning a non-zero code the way real Compound v2 markets do. Once
either mock is upgraded to actually hold funds (needed anyway before a
real integration), add tests that simulate a failing/paused venue.

### 6. No emergency pause

There's no way to halt `deposit()`/`withdraw()` if a bug is found
post-deployment short of the owner's `setMockAPY`/threshold levers, none
of which actually stop the functions from being called. Consider
OpenZeppelin's `Pausable` on `deposit()` (leaving `withdraw()` always
available, so a pause can never trap user funds) before mainnet.

### 7. No deposit caps

Nothing limits how much a single user or the contract in aggregate can
hold. Not a vulnerability by itself, but most protocols cap TVL during an
initial launch window specifically to limit the damage of an
undiscovered bug. Worth considering for a real launch, not necessarily
for a testnet demo.

## What looks solid

- Reentrancy: `nonReentrant` on both `deposit()` and `withdraw()`, and
  it's actually tested — `MaliciousKinetic` attempts a real reentrant
  call from within both `mint()` and `redeemUnderlying()`, and the test
  asserts the specific `ReentrancyGuardReentrantCall` revert rather than
  just "it reverts."
- Access control: every state-changing admin function is `onlyOwner` and
  has both a success-path and a revert-path test.
- Integer safety: Solidity 0.8's built-in overflow checks cover the
  `amount * daysHeld` reputation score; the values involved (realistic
  FXRP amounts × realistic day counts) are nowhere near uint256's range
  regardless.
- `kinetic`/`morpho`/`fxrp` addresses are `immutable` — can't be swapped
  post-deploy, so there's no "owner rugs by pointing at a malicious
  contract later" vector, only the address chosen at construction time.

## Recommendation

Get an independent audit before any mainnet deployment or real user
funds — this self-review is useful for catching what a first pass by the
authors can catch, which is a narrower set of problems than what a fresh
pair of eyes (or a proper audit firm) will find. At minimum, findings 2–4
above are the kind of thing a real audit exists to catch systematically
rather than by inspection.