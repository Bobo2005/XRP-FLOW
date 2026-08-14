// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMorpho} from "../interfaces/IMorpho.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MockMorpho
/// @notice A well-behaved mock of Morpho Blue, used to exercise
///         YieldRouter's Morpho routing path in tests without a real
///         Morpho deployment. Matches IMorpho's real singleton ABI.
/// @dev Ignores the content of MarketParams beyond using it to satisfy the
///      interface — this mock doesn't model isolated markets, oracles, or
///      interest accrual, only supply/withdraw bookkeeping, mirroring how
///      MockKinetic handles the Kinetic side. 1:1 shares for simplicity.
///      Not used in production.
contract MockMorpho is IMorpho {
    /// @notice The FXRP token contract that this mock holds and transfers.
    IERC20 public fxrpToken;

    /// @notice Tracks the amount each `onBehalf` address has supplied.
    mapping(address => uint256) public supplied;

    /// @notice Records a supply call, minting 1:1 shares for simplicity.
    function supply(
        MarketParams memory /* marketParams */,
        uint256 assets,
        uint256 /* shares */,
        address onBehalf,
        bytes memory /* data */
    ) external override returns (uint256 assetsSupplied, uint256 sharesSupplied) {
        // Transfer the underlying tokens from the caller (router) to this contract.
        require(fxrpToken.transferFrom(msg.sender, address(this), assets), "FXRP transfer failed");
        supplied[onBehalf] += assets;
        return (assets, assets);
    }

    /// @notice Records a withdrawal, reverting if `onBehalf` hasn't
    ///         supplied enough.
    /// @dev Real Morpho Blue would revert on insufficient liquidity or
    ///      shares too, so reverting here (rather than returning a
    ///      Compound-style error code, which Morpho doesn't use) matches
    ///      the real contract's behavior.
    function withdraw(
        MarketParams memory /* marketParams */,
        uint256 assets,
        uint256 /* shares */,
        address onBehalf,
        address receiver
    ) external override returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn) {
        require(supplied[onBehalf] >= assets, "MockMorpho: insufficient supplied");
        supplied[onBehalf] -= assets;
        // Transfer the underlying tokens from this contract to the receiver.
        require(fxrpToken.transfer(receiver, assets), "FXRP transfer failed");
        return (assets, assets);
    }

    /// @notice Returns an empty Market struct — this mock doesn't track
    ///         aggregate market state, only per-address supplied amounts.
    function market(bytes32 /* id */) external pure override returns (Market memory) {
        return Market(0, 0, 0, 0, 0, 0);
    }

    /// @dev Constructor takes the FXRP token contract address.
    constructor(address _fxrpToken) {
        fxrpToken = IERC20(_fxrpToken);
    }
}