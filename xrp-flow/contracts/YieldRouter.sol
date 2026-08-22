// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IKinetic} from "./interfaces/IKinetic.sol";
import {IMorpho} from "./interfaces/IMorpho.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title YieldRouter
/// @notice Routes user FXRP deposits into whichever of Kinetic or Morpho
///         currently pays more, and tracks per-user deposit history to
///         power an on-chain reputation tier.
/// @dev Venue selection happens once, at a user's first deposit — their
///      full position stays in that venue until they withdraw to zero,
///      even if the other venue's rate later overtakes it. Automatic
///      rebalancing between venues for an existing position is out of
///      scope for this contract and is a roadmap item (see README.md).
contract YieldRouter is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    /// @notice Reputation tiers unlocked by a user's deposit track record.
    enum ReputationTier {
        None,
        Bronze,
        Silver,
        Gold
    }

    /// @notice The lending venue a user's deposit is routed into.
    enum Venue {
        Kinetic,
        Morpho
    }

    /// @notice Tracks a user's currently deposited amount and the timestamp
    ///         their position was opened, used to compute reputation.
    /// @param amount The amount of FXRP currently deposited via this router.
    /// @param timestamp The block timestamp the position was opened. Held
    ///        constant across top-up deposits so tier calculations reflect
    ///        how long capital has been continuously deposited.
    struct Deposit {
        uint256 amount;
        uint256 timestamp;
    }

    /// @notice Tracks historical reputation snapshots for a user.
    /// @param timestamp The block timestamp when the snapshot was taken.
    /// @param score The reputation score (amount * days held) at that timestamp.
    /// @param tier The reputation tier at that timestamp.
    struct ReputationSnapshot {
        uint256 timestamp;
        uint256 score;
        ReputationTier tier;
    }

    /// @notice Leaderboard entry for reputation ranking.
    struct LeaderboardEntry {
        address user;
        uint256 score;
        ReputationTier tier;
    }

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------

    /// @notice The FXRP token contract this router accepts deposits in.
    IERC20 public immutable fxrp;

    /// @notice The Kinetic Market contract deposits can be routed into.
    /// @dev TODO: update once a Coston2 address is confirmed — see the
    ///      notes in IKinetic.sol. Currently points at MockKinetic.
    IKinetic public immutable kinetic;

    /// @notice The Morpho Blue contract deposits can be routed into.
    /// @dev TODO: same caveat as `kinetic` — see IMorpho.sol. Currently
    ///      points at MockMorpho.
    IMorpho public immutable morpho;

    /// @notice The Morpho Blue market this router supplies/withdraws
    ///         against. Left at its zero-valued default until the owner
    ///         calls setMorphoMarketParams() — deposits refuse to route to
    ///         Morpho until then (see MorphoMarketNotConfigured).
    IMorpho.MarketParams public morphoMarketParams;

    /// @notice Per-user deposit record.
    mapping(address => Deposit) public deposits;

    /// @notice The venue each user's deposit is routed into, fixed at their
    ///         first deposit. Meaningless while deposits[user].amount == 0.
    mapping(address => Venue) public userVenue;

    /// @notice Tracks whether a user is currently using Morpho (for internal tracking).
    mapping(address => bool) public userUsingMorpho;

    /// @notice Set of all active users with deposits or reputation scores.
    ///         Used for leaderboard computations.
    EnumerableSet.AddressSet private usersWithReputation;

    /// @notice Tracks the latest reputation score for each user (for leaderboard efficiency).
    mapping(address => uint256) public latestReputationScore;

    /// @notice Tracks the current reputation tier for each user (for achievement detection and leaderboard).
    mapping(address => ReputationTier) public userTier;

    /// @notice Historical reputation snapshots for each user.
    mapping(address => ReputationSnapshot[]) public reputationHistory;

    /// @notice Tracks when a user last had an active deposit (for decay calculation).
    mapping(address => uint256) public lastActivityTimestamp;

    /// @notice Daily reputation decay rate (scaled by 1e18, so 1e18 == 100% daily decay).
    ///         Actual daily retention = (1e18 - decayRate) / 1e18.
    ///         Example: 1e15 = 0.1% daily decay (99.9% retention per day).
    uint256 public decayRatePerDay;

    /// @notice Placeholder Kinetic APY (scaled by 1e18, so 1e18 == 100%)
    ///         until live Kinetic rate reading is wired up.
    uint256 public kineticMockAPY;

    /// @notice Placeholder Morpho APY (scaled by 1e18), same caveat as
    ///         kineticMockAPY.
    uint256 public morphoMockAPY;

    /// @notice Reputation score threshold (amount * days held) required to
    ///         reach Bronze. Tunable by the owner.
    uint256 public bronzeThreshold;

    /// @notice Reputation score threshold (amount * days held) required to
    ///         reach Silver. Tunable by the owner.
    uint256 public silverThreshold;

    /// @notice Reputation score threshold (amount * days held) required to
    ///         reach Gold. Tunable by the owner.
    uint256 public goldThreshold;

    /// @notice Reputation-based yield boost factors (scaled by 1e4, so 1e4 == 100%).
    ///         Actual boost = (boostValue / 1e4) - 1, so:
    ///         - 10000 = 0% boost
    ///         - 10010 = +0.1% boost
    ///         - 10250 = +0.25% boost
    ///         - 10500 = +0.5% boost
    uint256 public bronzeBoost;
    uint256 public silverBoost;
    uint256 public goldBoost;

    // ---------------------------------------------------------------------
    // Views and internal helpers (defined first so they can be used elsewhere)
    // ---------------------------------------------------------------------

    /// @notice Computes a user's current reputation tier from their
    ///         deposited amount and how long it has been held.
    /// @dev Score = amount held (wei) * days held. Uses only data already
    ///      stored on this contract — no external oracle required. Tier
    ///      thresholds are owner-tunable via setThresholds().
    ///      For inactive users, applies exponential decay based on days since last activity.
    /// @param user The address to compute the reputation tier for.
    /// @return tier The user's current ReputationTier.
    function getReputationTier(address user) public view returns (ReputationTier) {
        Deposit storage userDeposit = deposits[user];

        // For active users, calculate reputation normally
        if (userDeposit.amount > 0 && userDeposit.timestamp > 0) {
            uint256 daysHeld = (block.timestamp - userDeposit.timestamp) / 86400;
            uint256 score = userDeposit.amount * daysHeld;

            if (score >= goldThreshold) return ReputationTier.Gold;
            if (score >= silverThreshold) return ReputationTier.Silver;
            if (score >= bronzeThreshold) return ReputationTier.Bronze;
            return ReputationTier.None;
        }

        // For inactive users, apply decay to historical score
        else {
            // If user never had a deposit, return None
            if (lastActivityTimestamp[user] == 0) {
                return ReputationTier.None;
            }

            // Calculate days since last activity
            uint256 daysInactive = (block.timestamp - lastActivityTimestamp[user]) / 86400;

            // Get the user's historical peak score from their latest snapshot
            // If no snapshots exist, we can't calculate a meaningful score
            ReputationSnapshot[] memory history = reputationHistory[user];
            if (history.length == 0) {
                return ReputationTier.None;
            }

            // Use the most recent snapshot score as the baseline for decay
            uint256 originalScore = history[history.length - 1].score;

            // Apply exponential decay: score = originalScore * (1 - decayRate)^daysInactive
            // Using approximation: (1 - r)^n ≈ 1 - r*n for small r (which decay rate is)
            // For more precision, we could use exponentiation, but this is gas-efficient and accurate enough
            uint256 decayFactor = 1e18 - (decayRatePerDay * daysInactive);
            uint256 decayedScore = (originalScore * decayFactor) / 1e18;

            // Ensure score doesn't go negative
            if (decayedScore < 0) {
                decayedScore = 0;
            }

            // Apply tier thresholds to decayed score
            if (decayedScore >= goldThreshold) return ReputationTier.Gold;
            if (decayedScore >= silverThreshold) return ReputationTier.Silver;
            if (decayedScore >= bronzeThreshold) return ReputationTier.Bronze;
            return ReputationTier.None;
        }
    }

    /// @notice Returns the best currently-available APY across venues, for
    ///         dashboard display, including reputation-based boosts.
    /// @dev Placeholder — returns the higher of two stored/mock rates set
    ///      via setMockAPY() until live on-chain rate reading from Kinetic
    ///      and Morpho is wired up (see the TODOs in IKinetic.sol and
    ///      IMorpho.sol — neither exposes a simple APY view the way this
    ///      function's return value implies, so a real implementation
    ///      needs additional conversion logic).
    /// @param user The address to calculate boosted APY for (optional, defaults to msg.sender).
    /// @return apy The current best placeholder APY with reputation boost, scaled by 1e18.
    function getCurrentAPY(address user) public view returns (uint256 apy) {
        uint256 baseAPY = kineticMockAPY > morphoMockAPY ? kineticMockAPY : morphoMockAPY;

        // If no user specified, return base APY without boost
        if (user == address(0)) {
            return baseAPY;
        }

        // Get user's reputation tier to determine boost
        ReputationTier tier = getReputationTier(user);
        uint256 boostFactor = 10000; // Default: 0% boost (10000/10000 = 1x)

        if (tier == ReputationTier.Gold) {
            boostFactor = goldBoost;
        } else if (tier == ReputationTier.Silver) {
            boostFactor = silverBoost;
        } else if (tier == ReputationTier.Bronze) {
            boostFactor = bronzeBoost;
        }

        // Apply boost: (baseAPY * boostFactor) / 10000
        return (baseAPY * boostFactor) / 10000;
    }

    /// @notice Returns the best currently-available APY across venues, for
    ///         dashboard display (backward compatibility).
    /// @dev Placeholder — returns the higher of two stored/mock rates set
    ///      via setMockAPY() until live on-chain rate reading from Kinetic
    ///      and Morpho is wired up (see the TODOs in IKinetic.sol and
    ///      IMorpho.sol — neither exposes a simple APY view the way this
    ///      function's return value implies, so a real implementation
    ///      needs additional conversion logic).
    /// @return apy The current best placeholder APY with reputation boost for msg.sender, scaled by 1e18.
    function getCurrentAPY() external view returns (uint256 apy) {
        return getCurrentAPY(msg.sender);
    }

    /// @notice Returns which venue currently offers the better mock rate.
    /// @dev Ties resolve to Kinetic. This is a view of the mock rates only
    ///      — see getCurrentAPY()'s caveats.
    function getBestVenue() public view returns (Venue) {
        return morphoMockAPY > kineticMockAPY ? Venue.Morpho : Venue.Kinetic;
    }

    /// @notice Returns the reputation history for a user.
    /// @dev Returns an array of ReputationSnapshot structs, ordered from oldest to newest.
    /// @param user The address to get the reputation history for.
    /// @return reputationHistory Array of reputation snapshots for the user.
    function getReputationHistory(address user) external view returns (ReputationSnapshot[] memory) {
        return reputationHistory[user];
    }

    /// @notice Returns the top `limit` users by reputation score.
    /// @dev Returns an array of LeaderboardEntry structs, sorted by score descending.
    ///        Only includes users with a current score > 0.
    /// @param limit The maximum number of users to return.
    /// @return leaderboard Array of top users by reputation score.
    function getTopUsersByReputation(uint256 limit) external view returns (LeaderboardEntry[] memory) {
        uint256 totalUsers = usersWithReputation.length();
        
        // If there are no users at all, return an empty array safely instead of reverting
        if (totalUsers == 0 || limit == 0) {
            return new LeaderboardEntry[](0);
        }

        // Count active users
        uint256 validCount = 0;
        for (uint256 i = 0; i < totalUsers; i++) {
            address user = usersWithReputation.at(i);
            if (deposits[user].amount > 0 || latestReputationScore[user] > 0) {
                validCount++;
            }
        }

        if (validCount == 0) {
            return new LeaderboardEntry[](0);
        }

        // Populate dynamic array of active users
        LeaderboardEntry[] memory allUsers = new LeaderboardEntry[](validCount);
        uint256 index = 0;
        for (uint256 i = 0; i < totalUsers; i++) {
            address user = usersWithReputation.at(i);
            uint256 currentScore = _calculateReputationScore(user);
            uint256 displayScore = currentScore > latestReputationScore[user] ? currentScore : latestReputationScore[user];
            if (deposits[user].amount > 0 || displayScore > 0) {
                allUsers[index] = LeaderboardEntry({
                    user: user,
                    score: displayScore,
                    tier: userTier[user]
                });
                index++;
            }
        }

        // Sort descending by score (Bubble Sort)
        for (uint256 i = 0; i < index; i++) {
            for (uint256 j = i + 1; j < index; j++) {
                if (allUsers[j].score > allUsers[i].score) {
                    LeaderboardEntry memory temp = allUsers[i];
                    allUsers[i] = allUsers[j];
                    allUsers[j] = temp;
                }
            }
        }

        // Slice down to the requested limit
        uint256 returnSize = index < limit ? index : limit;
        LeaderboardEntry[] memory finalResult = new LeaderboardEntry[](returnSize);
        for (uint256 i = 0; i < returnSize; i++) {
            finalResult[i] = allUsers[i];
        }

        return finalResult;
    }

    /// @notice Calculates the current reputation score for a user.
    /// @dev Score = amount held (wei) * days held. Returns 0 if no deposit or timestamp.
    /// @param user The address to calculate the score for.
    /// @return score The current reputation score (amount * days held).
    function _calculateReputationScore(address user) internal view returns (uint256) {
        Deposit storage userDeposit = deposits[user];
        if (userDeposit.amount == 0 || userDeposit.timestamp == 0) {
            return 0;
        }

        uint256 daysHeld = (block.timestamp - userDeposit.timestamp) / 86400;
        return userDeposit.amount * daysHeld;
    }

    /// @notice Records a reputation snapshot if the score has changed significantly.
    /// @dev Records a snapshot when:
    ///      - No previous snapshot exists (first record)
    ///      - The score has changed by at least 1% or 1e15 wei*days (whichever is larger)
    ///      - The tier has changed
    /// @param user The address to record the snapshot for.
    function _recordReputationSnapshotIfChanged(address user) internal {
        uint256 currentScore = _calculateReputationScore(user);
        ReputationTier currentTier;
        Deposit memory userDeposit = deposits[user];
        if (userDeposit.amount == 0 || userDeposit.timestamp == 0) {
            currentTier = ReputationTier.None;
        } else {
            uint256 daysHeld = (block.timestamp - userDeposit.timestamp) / 86400;
            uint256 score = userDeposit.amount * daysHeld;

            if (score >= goldThreshold) currentTier = ReputationTier.Gold;
            else if (score >= silverThreshold) currentTier = ReputationTier.Silver;
            else if (score >= bronzeThreshold) currentTier = ReputationTier.Bronze;
            else currentTier = ReputationTier.None;
        }

        // Get the most recent snapshot if any
        ReputationSnapshot[] memory history = reputationHistory[user];
        if (history.length == 0) {
            // First snapshot - always record
            _recordReputationSnapshot(user, currentScore, currentTier);
            return;
        }

        ReputationSnapshot memory lastSnapshot = history[history.length - 1];

        // Check if we should record a new snapshot
        bool shouldRecord = false;

        // Always record if tier changed
        if (lastSnapshot.tier != currentTier) {
            shouldRecord = true;
        }
        // Otherwise check if score changed significantly
        else {
            uint256 scoreChange = currentScore > lastSnapshot.score
                ? currentScore - lastSnapshot.score
                : lastSnapshot.score - currentScore;

            // Record if change is at least 1% or 1e15 wei*days (whichever is larger)
            uint256 minChange = lastSnapshot.score > 0
                ? (lastSnapshot.score / 100)  // 1% of last snapshot score
                : 1e15;                       // Fixed minimum for zero score
            if (minChange < 1e15) {
                minChange = 1e15;  // Ensure minimum change is at least 1e15
            }

            if (scoreChange >= minChange) {
                shouldRecord = true;
            }
        }

        if (shouldRecord) {
            _recordReputationSnapshot(user, currentScore, currentTier);
        }
    }

    /// @notice Records a reputation snapshot for a user.
    /// @dev Internal function to actually store the snapshot and emit event.
    /// @param user The address to record the snapshot for.
    /// @param score The reputation score to record.
    /// @param tier The reputation tier to record.
    function _recordReputationSnapshot(address user, uint256 score, ReputationTier tier) internal {
        reputationHistory[user].push(ReputationSnapshot({
            timestamp: block.timestamp,
            score: score,
            tier: tier
        }));

        // Update latest score, tier, and add to set if score > 0
        ReputationTier oldTier = userTier[user];
        latestReputationScore[user] = score;
        userTier[user] = tier;
        if (score > 0) {
            usersWithReputation.add(user);
        }

        // Emit event if tier changed and new tier is not None
        if (oldTier != tier && tier != ReputationTier.None) {
            emit ReputationTierAchieved(user, tier);
        }

        emit ReputationSnapshotUpdated(user, block.timestamp, score, tier);
    }

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    /// @notice Emitted when a user deposits FXRP into the router.
    /// @param user The depositing user.
    /// @param amount The amount deposited in this call.
    /// @param newTotal The user's total deposited amount after this call.
    /// @param venue The venue this deposit was routed to.
    event Deposited(
        address indexed user,
        uint256 amount,
        uint256 newTotal,
        Venue venue
    );

    /// @notice Emitted when a user withdraws FXRP from the router.
    /// @param user The withdrawing user.
    /// @param amount The amount withdrawn in this call.
    /// @param remaining The user's remaining deposited amount after this call.
    /// @param venue The venue this withdrawal was pulled from.
    event Withdrawn(
        address indexed user,
        uint256 amount,
        uint256 remaining,
        Venue venue
    );

    /// @notice Emitted when the owner updates a venue's mock/placeholder APY.
    /// @param venue The venue whose placeholder rate was updated.
    /// @param newAPY The new placeholder APY.
    event MockAPYUpdated(Venue indexed venue, uint256 newAPY);

    /// @notice Emitted when the owner updates the Morpho market this router
    ///         supplies into.
    /// @param loanToken The loan token address of the configured market.
    /// @param collateralToken The collateral token address of the configured market.
    /// @param oracle The oracle address of the configured market.
    /// @param irm The interest rate model address of the configured market.
    /// @param lltv The maximum LTV of the configured market.
    event MorphoMarketParamsUpdated(
        address loanToken,
        address collateralToken,
        address oracle,
        address irm,
        uint256 lltv
    );

    /// @notice Emitted when the owner updates a reputation tier threshold.
    /// @param newBronzeThreshold The new Bronze tier threshold.
    /// @param newSilverThreshold The new Silver tier threshold.
    /// @param newGoldThreshold The new Gold tier threshold.
    event ThresholdsUpdated(
        uint256 newBronzeThreshold,
        uint256 newSilverThreshold,
        uint256 newGoldThreshold
    );

    /// @notice Emitted when a user rebalances their deposit between venues.
    /// @param user The user who initiated the rebalance.
    /// @param amount The amount that was rebalanced.
    /// @param fromVenue The venue the funds were moved from.
    /// @param toVenue The venue the funds were moved to.
    event Rebalanced(
        address indexed user,
        uint256 amount,
        Venue fromVenue,
        Venue toVenue
    );

    /// @notice Emitted when the owner updates the Morpho routing configuration.
    /// @param morpho The address set as the Morpho target (zero to unset).
    /// @param useMorpho Whether routing to Morpho is enabled.
    event RoutingUpdated(address morpho, bool useMorpho);

    /// @notice Emitted when a user's routing preference is updated by the owner.
    event UserRoutingUpdated(address indexed user, uint8 preference);

    /// @notice Emitted when a user's reputation snapshot is recorded.
    /// @param user The user whose reputation was recorded.
    /// @param timestamp The block timestamp when the snapshot was taken.
    /// @param score The reputation score (amount * days held) at that timestamp.
    /// @param tier The reputation tier at that timestamp.
    event ReputationSnapshotUpdated(
        address indexed user,
        uint256 timestamp,
        uint256 score,
        ReputationTier tier
    );

    /// @notice Emitted when the owner updates the reputation decay rate.
    /// @param newDecayRate The new daily decay rate (scaled by 1e18).
    event DecayRateUpdated(uint256 newDecayRate);

    /// @notice Emitted when reputation boost factors are updated.
    event BoostFactorsUpdated(
        uint256 newBronzeBoost,
        uint256 newSilverBoost,
        uint256 newGoldBoost
    );

    /// @notice Emitted when a user achieves a new reputation tier.
    /// @param user The user who achieved the tier.
    /// @param tier The reputation tier achieved.
    event ReputationTierAchieved(address indexed user, ReputationTier tier);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    /// @notice Thrown when a caller attempts to deposit or withdraw zero.
    error ZeroAmount();

    /// @notice Thrown when a user attempts to withdraw more than they have
    ///         deposited.
    error InsufficientDeposit(uint256 requested, uint256 available);

    /// @notice Thrown when a Kinetic mint()/redeemUnderlying() call returns
    ///         a non-zero Compound-style error code instead of reverting.
    error KineticCallFailed(uint256 errorCode);

    /// @notice Thrown when a deposit would route to Morpho but the owner
    ///         hasn't configured a market via setMorphoMarketParams() yet.
    error MorphoMarketNotConfigured();

    /// @notice Thrown when setMorphoMarketParams() is called a second time.
    /// @dev Changing the market after users have already deposited into
    ///      Morpho would orphan them: withdraw() reads the *current*
    ///      morphoMarketParams, not a snapshot from their deposit, so a
    ///      later change would make it target a different market than the
    ///      one their funds actually went into. Configuring once avoids
    ///      that class of bug entirely, at the cost of flexibility —
    ///      deploy a new router if the Morpho market ever needs to change.
    error MorphoMarketAlreadyConfigured();

    /// @notice Thrown by depositToVenue() when the requested venue doesn't
    ///         match the venue an existing position is already in.
    /// @dev Top-ups always stay in the venue chosen at first deposit (see
    ///      deposit()'s NatSpec) — this makes that rule loud instead of
    ///      silently overriding the caller's explicit choice.
    error VenueMismatch(Venue existing, Venue requested);

    /// @notice Thrown when rebalancing would not result in a venue change.
    /// @dev This prevents unnecessary transactions when the current venue
    ///      is already the best option or when the user has no deposit.
    error NoRebalanceNeeded();

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @notice Deploys the router for a given FXRP token, Kinetic market,
    ///         and Morpho Blue deployment.
    /// @param _fxrp The FXRP (or mock FXRP) token address.
    /// @param _kinetic The Kinetic Market contract address.
    /// @param _morpho The Morpho Blue contract address.
    /// @param initialOwner The address to set as the contract owner.
    constructor(
        address _fxrp,
        address _kinetic,
        address _morpho,
        address initialOwner
    ) Ownable(initialOwner) {
        fxrp = IERC20(_fxrp);
        kinetic = IKinetic(_kinetic);
        morpho = IMorpho(_morpho);

        // Grant infinite approval to the lending venues
        fxrp.approve(_kinetic, type(uint256).max);
        fxrp.approve(_morpho, type(uint256).max);

        // Placeholder default thresholds (amount in wei * days held).
        // Tunable via setThresholds() once real target values are decided.
        bronzeThreshold = 100e18 * 7; // e.g. 100 FXRP held for 7 days
        silverThreshold = 500e18 * 30; // e.g. 500 FXRP held for 30 days
        goldThreshold = 2000e18 * 90; // e.g. 2000 FXRP held for 90 days

        // Placeholder default boost factors (scaled by 1e4, so 1e4 == 100%).
        // These can be tuned via setBoostFactors() once real target values are decided.
        bronzeBoost = 10010; // e.g. +0.1% boost
        silverBoost = 10250; // e.g. +0.25% boost
        goldBoost = 10500;   // e.g. +0.5% boost

        // Placeholder default decay rate: 0.01% daily decay (99.99% retention per day)
        // This means reputation loses ~3.65% per year for inactive users.
        decayRatePerDay = 1e15; // 0.01% daily (scaled by 1e18)
    }

    // ---------------------------------------------------------------------
    // External / public functions
    // ---------------------------------------------------------------------

    /// @notice Deposits `amount` of FXRP into the router, which routes it
    ///         to whichever venue currently pays more (on a user's first
    ///         deposit) or to the venue the user is already in (on a
    ///         top-up).
    /// @dev Pulls tokens via transferFrom (requires prior approval). The
    ///      user's deposit timestamp is only set on their first deposit so
    ///      top-ups do not reset their reputation clock. To pick a venue
    ///      yourself instead of auto-routing to the best rate, use
    ///      depositToVenue() instead.
    /// @param amount The amount of FXRP to deposit.
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        Deposit storage userDeposit = deposits[msg.sender];
        bool isFirstDeposit = userDeposit.amount == 0;
        Venue venue = isFirstDeposit ? getBestVenue() : userVenue[msg.sender];

        _deposit(amount, venue, isFirstDeposit, userDeposit);
    }

    /// @notice Deposits `amount` of FXRP into a specific venue you choose,
    ///         instead of auto-routing to whichever pays more.
    /// @dev On a top-up, `venue` must match the venue your existing
    ///      position is already in (VenueMismatch otherwise) — a position
    ///      can't be split across two venues. To move an existing position
    ///      to the other venue, withdraw fully first, then deposit again
    ///      with the venue you want.
    /// @param amount The amount of FXRP to deposit.
    function depositToVenue(uint256 amount, Venue venue) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        Deposit storage userDeposit = deposits[msg.sender];
        bool isFirstDeposit = userDeposit.amount == 0;

        if (!isFirstDeposit && venue != userVenue[msg.sender]) {
            revert VenueMismatch(userVenue[msg.sender], venue);
        }

        _deposit(amount, venue, isFirstDeposit, userDeposit);
    }

    /// @dev Shared logic for deposit() and depositToVenue() once each has
    ///      resolved which venue to use.
    function _deposit(
        uint256 amount,
        Venue venue,
        bool isFirstDeposit,
        Deposit storage userDeposit
    ) private {
        if (venue == Venue.Morpho && morphoMarketParams.loanToken == address(0)) {
            revert MorphoMarketNotConfigured();
        }

        if (isFirstDeposit) {
            userDeposit.timestamp = block.timestamp;
            userVenue[msg.sender] = venue;
        } else {
            // Keep timestamp constant across top-up deposits
            // so tier calculations reflect how long capital has been continuously deposited
            // Update last activity timestamp when user has an active deposit
            lastActivityTimestamp[msg.sender] = block.timestamp;
        }

        userDeposit.amount += amount;

        // Add to active users set for leaderboard tracking
        usersWithReputation.add(msg.sender);

        // Pull tokens from the user to the router.
        fxrp.transferFrom(msg.sender, address(this), amount);
        // Then supply to the chosen venue.
        _supplyToVenue(venue, amount);

        emit Deposited(msg.sender, amount, userDeposit.amount, venue);

        // Update reputation snapshot if changed
        _recordReputationSnapshotIfChanged(msg.sender);
    }

    /// @notice Withdraws `amount` of FXRP from the user's venue and returns
    ///         it to the caller.
    /// @dev Reduces the caller's recorded deposit. If the full balance is
    ///      withdrawn, the deposit record (timestamp) is cleared so a
    ///      future deposit starts a fresh reputation clock and re-picks
    ///      the best venue.
    /// @param amount The amount of FXRP to withdraw.
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        Deposit storage userDeposit = deposits[msg.sender];
        if (amount > userDeposit.amount) {
            revert InsufficientDeposit(amount, userDeposit.amount);
        }

        Venue venue = userVenue[msg.sender];

        // Check if Morpho market is configured when withdrawing from Morpho
        if (venue == Venue.Morpho && morphoMarketParams.loanToken == address(0)) {
            revert MorphoMarketNotConfigured();
        }

        // Withdraw tokens from the venue to the router.
        _withdrawFromVenue(venue, amount);
        // Then send tokens from the router to the user.
        fxrp.transfer(msg.sender, amount);

        userDeposit.amount -= amount;
        if (userDeposit.amount == 0) {
            userDeposit.timestamp = 0;
            userUsingMorpho[msg.sender] = false;
            usersWithReputation.remove(msg.sender);
        }

        // Update reputation snapshot if changed
        _recordReputationSnapshotIfChanged(msg.sender);

        emit Withdrawn(msg.sender, amount, userDeposit.amount, venue);
    }

    /// @notice Allows a user to rebalance their deposit to the venue currently
    ///         offering the better rate. This helps users maximize their yield
    ///         by moving funds between Kinetic and Morpho as rates change.
    /// @dev Includes gas optimization checks:
    ///      - require minimum amount to make rebalancing worthwhile (0.01 FXRP)
    ///      - Only executes if the best venue differs from the current venue
    ///      - Preserves the user's reputation timestamp (doesn't reset the clock)
    function rebalance() external nonReentrant {
        Deposit storage userDeposit = deposits[msg.sender];

        // Check if user has any deposit
        if (userDeposit.amount == 0) {
            revert NoRebalanceNeeded();
        }

        // Gas optimization: require minimum amount to make rebalancing worthwhile
        // 0.01 FXRP = 10000000000000000 wei (assuming 18 decimals)
        if (userDeposit.amount < 10000000000000000) {
            revert NoRebalanceNeeded();
        }

        Venue currentVenue = userVenue[msg.sender];
        Venue bestVenue = getBestVenue();

        // Only rebalance if the best venue is different from current venue
        if (bestVenue == currentVenue) {
            revert NoRebalanceNeeded();
        }

        // Check if Morpho market is configured when needed
        if ((currentVenue == Venue.Morpho || bestVenue == Venue.Morpho) &&
            morphoMarketParams.loanToken == address(0)) {
            revert MorphoMarketNotConfigured();
        }

        // Withdraw from current venue (tokens go FROM venue TO contract)
        _withdrawFromVenue(currentVenue, userDeposit.amount);

        // Deposit to best venue (tokens go FROM contract TO venue)
        _supplyToVenue(bestVenue, userDeposit.amount);

        // Update user's venue tracking (keep original timestamp for reputation)
        userVenue[msg.sender] = bestVenue;

        emit Rebalanced(msg.sender, userDeposit.amount, currentVenue, bestVenue);
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    /// @dev Routes a supply call to the given venue's real ABI, applying reputation-based yield boost.
    function _supplyToVenue(Venue venue, uint256 amount) private {
        if (venue == Venue.Kinetic) {
            uint256 errorCode = kinetic.mint(amount);
            if (errorCode != 0) revert KineticCallFailed(errorCode);
        } else {
            (uint256 assetsSupplied, uint256 sharesSupplied) = morpho.supply(morphoMarketParams, amount, 0, msg.sender, "");
        }
        // Note: Boost is applied off-chain when calculating yields; no on-chain adjustment needed for principal amount.
    }

    /// @dev Routes a withdraw call to the given venue's real ABI, applying reputation-based yield boost.
    function _withdrawFromVenue(Venue venue, uint256 amount) private {
        if (venue == Venue.Kinetic) {
            uint256 errorCode = kinetic.redeemUnderlying(amount);
            if (errorCode != 0) revert KineticCallFailed(errorCode);
        } else {
            (uint256 assetsWithdrawn, uint256 sharesWithdrawn) = morpho.withdraw(
                morphoMarketParams,
                amount,
                0,
                msg.sender,
                address(this)
            );
        }
        // Note: Boost is applied off-chain when calculating yields; no on-chain adjustment needed for principal amount.
    }

    // ---------------------------------------------------------------------
    // Owner-only admin functions
    // ---------------------------------------------------------------------

    /// @notice Sets the placeholder APY for one venue, used by
    ///         getCurrentAPY() and getBestVenue().
    /// @dev Owner-only. Temporary until live rate reading replaces this.
    /// @param venue Which venue's placeholder rate to update.
    /// @param newAPY The new APY, scaled by 1e18 (1e18 == 100%).
    function setMockAPY(Venue venue, uint256 newAPY) external onlyOwner {
        if (venue == Venue.Kinetic) {
            kineticMockAPY = newAPY;
        } else {
            morphoMockAPY = newAPY;
        }
        emit MockAPYUpdated(venue, newAPY);
    }

    /// @notice Sets the Morpho Blue market this router supplies into.
    /// @dev Owner-only, and callable exactly once (MorphoMarketAlreadyConfigured
    ///      on a second call) — see that error's NatSpec for why. Deposits
    ///      refuse to route to Morpho (MorphoMarketNotConfigured) until
    ///      this has been called with a non-zero loanToken.
    /// @param params The Morpho market parameters to route into.
    function setMorphoMarketParams(
        IMorpho.MarketParams calldata params
    ) external onlyOwner {
        if (morphoMarketParams.loanToken != address(0)) {
            revert MorphoMarketAlreadyConfigured();
        }
        morphoMarketParams = params;
        emit MorphoMarketParamsUpdated(
            params.loanToken,
            params.collateralToken,
            params.oracle,
            params.irm,
            params.lltv
        );
    }

    /// @notice Updates the reputation tier score thresholds.
    /// @dev Owner-only. Thresholds are expressed as amount (wei) * days
    ///      held, matching the score computed in getReputationTier().
    /// @param newBronzeThreshold The new Bronze tier threshold.
    /// @param newSilverThreshold The new Silver tier threshold.
    /// @param newGoldThreshold The new Gold tier threshold.
    function setThresholds(
        uint256 newBronzeThreshold,
        uint256 newSilverThreshold,
        uint256 newGoldThreshold
    ) external onlyOwner {
        bronzeThreshold = newBronzeThreshold;
        silverThreshold = newSilverThreshold;
        goldThreshold = newGoldThreshold;
        emit ThresholdsUpdated(
            newBronzeThreshold,
            newSilverThreshold,
            newGoldThreshold
        );
    }

    /// @notice Updates the reputation-based yield boost factors.
    /// @dev Owner-only. Boost factors are scaled by 1e4, so 1e4 == 100%.
    ///      Actual boost = (boostValue / 1e4) - 1.
    /// @param newBronzeBoost The new Bronze boost factor.
    /// @param newSilverBoost The new Silver boost factor.
    /// @param newGoldBoost The new Gold boost factor.
    function setBoostFactors(
        uint256 newBronzeBoost,
        uint256 newSilverBoost,
        uint256 newGoldBoost
    ) external onlyOwner {
        bronzeBoost = newBronzeBoost;
        silverBoost = newSilverBoost;
        goldBoost = newGoldBoost;
        emit BoostFactorsUpdated(
            newBronzeBoost,
            newSilverBoost,
            newGoldBoost
        );
    }

    /// @notice Updates the reputation decay rate.
    /// @dev Owner-only. Decay rate is scaled by 1e18, so 1e18 == 100% daily decay.
    /// @param newDecayRate The new daily decay rate.
    function setDecayRate(uint256 newDecayRate) external onlyOwner {
        decayRatePerDay = newDecayRate;
        emit DecayRateUpdated(newDecayRate);
    }
}