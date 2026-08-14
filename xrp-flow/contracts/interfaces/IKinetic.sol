// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IKinetic
/// @notice Interface for Kinetic Market's kToken money market on Flare,
///         used by YieldRouter to supply and withdraw FXRP.
/// @dev Kinetic is a Compound v2 fork — confirmed from the contract names
///      published at docs.kinetic.market (Unitroller, Comptroller,
///      CNativeDelegator, Erc20Delegate, and "k"-prefixed market tokens
///      like kUSDC.e, ksFLR). This interface matches Compound v2's CToken
///      ABI, which Kinetic's kTokens implement.
///
///      IMPORTANT — confirmed but unresolved as of this writing:
///        - Every address published at docs.kinetic.market/contracts-and-
///          api-documentation resolves on Flare MAINNET (chain 14), not
///          Coston2 (chain 114). The FXRP market ("ISO FXRP") lives at
///          0xD1b7A5eFa9bd88F291F7A4563a8f6185c0249CB3 on mainnet.
///          No Coston2 address for Kinetic's FXRP market is published.
///        - This project targets Coston2 per the bounty rules, so
///          YieldRouter currently routes to MockKinetic instead. See
///          README.md's roadmap for the options once a Coston2 address is
///          available (or if the project moves to mainnet).
interface IKinetic {
    /// @notice Supplies the underlying asset (FXRP) to the market and mints
    ///         kTokens to the caller in exchange, per Compound v2's CToken
    ///         convention.
    /// @dev Compound v2 CTokens return a uint256 error code (0 == success)
    ///      rather than reverting on failure — callers must check the
    ///      return value.
    /// @param mintAmount The amount of the underlying asset to supply.
    /// @return errorCode 0 on success; non-zero Compound error codes on
    ///         failure (see Kinetic's ErrorReporter for the code list).
    function mint(uint256 mintAmount) external returns (uint256 errorCode);

    /// @notice Redeems `redeemAmount` of the underlying asset (FXRP) by
    ///         burning the necessary amount of the caller's kTokens.
    /// @dev Compound v2 naming: `redeemUnderlying` takes an underlying-asset
    ///      amount, as opposed to `redeem`, which takes a kToken amount.
    /// @param redeemAmount The amount of the underlying asset to withdraw.
    /// @return errorCode 0 on success; non-zero Compound error codes on
    ///         failure.
    function redeemUnderlying(uint256 redeemAmount)
        external
        returns (uint256 errorCode);

    /// @notice Returns the current supply interest rate, per block.
    /// @dev Compound v2 markets express rates per block, not as an
    ///      annualized APY — converting to APY requires knowing Flare's
    ///      average block time and compounding
    ///      ((1 + ratePerBlock) ^ blocksPerYear - 1). This differs from the
    ///      placeholder assumption used elsewhere in this codebase
    ///      (YieldRouter.mockAPY, scaled by 1e18 == 100%) and needs
    ///      reconciling before this interface replaces the mock.
    /// @return ratePerBlock The per-block supply rate, scaled by 1e18.
    function supplyRatePerBlock() external view returns (uint256 ratePerBlock);

    /// @notice Returns the caller's current kToken balance.
    /// @dev Needed to convert a kToken balance back to an underlying-asset
    ///      amount via exchangeRateStored(), since kTokens (like cTokens)
    ///      accrue value through an increasing exchange rate rather than a
    ///      rebasing balance.
    function balanceOf(address account) external view returns (uint256);

    /// @notice Returns the current exchange rate between kTokens and the
    ///         underlying asset, scaled by 1e18.
    function exchangeRateStored() external view returns (uint256);
}