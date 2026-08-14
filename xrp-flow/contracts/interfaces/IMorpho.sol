// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IMorpho
/// @notice Interface for Morpho Blue, the singleton lending contract Morpho
///         launched on Flare in February 2026 (per Flare's announcement:
///         flare.network/news/first-ever-modular-lending-for-xrp-debuts-on-
///         flare-via-morpho-and-mystic). Unlike Kinetic's per-asset market
///         contracts, Morpho Blue holds every isolated market inside one
///         deployed contract, keyed by a market Id derived from its
///         MarketParams.
/// @dev UNRESOLVED, same as IKinetic.sol:
///        - No confirmed Coston2 address for Morpho Blue on Flare — the
///          Flare launch announcement and docs.morpho.org's address list
///          only reference Flare mainnet (chain 14). YieldRouter currently
///          has no Morpho integration; APYComparison shows a labeled
///          placeholder rate instead.
///        - Computing an actual supply APY needs more than this interface:
///          Morpho Blue doesn't expose one directly. It requires reading
///          the market's interest rate model (IRM) contract — typically
///          `borrowRateView(MarketParams, Market)` — then deriving the
///          supply side from utilization and the market's fee. That's a
///          separate IIrm.sol interface, not written yet.
///        - Curator vaults on top of Morpho Blue (Clearstar, Carpathian —
///          MetaMorpho-style ERC-4626 wrappers) may be simpler to
///          integrate than raw Morpho Blue, since they expose a plain
///          ERC-4626 deposit/withdraw/convertToAssets interface instead of
///          the MarketParams-keyed calls below. Worth evaluating before
///          committing to this lower-level interface.
interface IMorpho {
    /// @notice Identifies one isolated market — the loan asset, collateral
    ///         asset, price oracle, interest rate model, and liquidation
    ///         LTV together. A market's Id is keccak256(abi.encode(this)).
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    /// @notice Aggregate on-chain state for one market.
    struct Market {
        uint128 totalSupplyAssets;
        uint128 totalSupplyShares;
        uint128 totalBorrowAssets;
        uint128 totalBorrowShares;
        uint128 lastUpdate;
        uint128 fee;
    }

    /// @notice Supplies `assets` of the loan token (FXRP, for the market
    ///         this project would use) into the given market on behalf of
    ///         `onBehalf`.
    /// @dev Pass `assets` with `shares` left at 0 to supply an exact
    ///      underlying amount (the usual case) — Morpho Blue lets callers
    ///      specify either assets or shares, not both.
    /// @param marketParams The market to supply into.
    /// @param assets The amount of the underlying asset to supply.
    /// @param shares Leave 0 when specifying `assets`.
    /// @param onBehalf The address credited with the resulting position.
    /// @param data Optional callback data; pass empty bytes if unused.
    /// @return assetsSupplied The actual amount of assets supplied.
    /// @return sharesSupplied The amount of supply shares minted.
    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsSupplied, uint256 sharesSupplied);

    /// @notice Withdraws `assets` of the loan token from the given market.
    /// @param marketParams The market to withdraw from.
    /// @param assets The amount of the underlying asset to withdraw.
    /// @param shares Leave 0 when specifying `assets`.
    /// @param onBehalf The address whose position is debited.
    /// @param receiver The address to receive the withdrawn assets.
    /// @return assetsWithdrawn The actual amount of assets withdrawn.
    /// @return sharesWithdrawn The amount of supply shares burned.
    function withdraw(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);

    /// @notice Returns the current aggregate state for a market.
    /// @param id The market Id, keccak256(abi.encode(MarketParams)).
    function market(bytes32 id) external view returns (Market memory);
}