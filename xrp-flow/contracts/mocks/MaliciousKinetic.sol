// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IKinetic} from "../interfaces/IKinetic.sol";

/// @dev Minimal view of YieldRouter needed to attempt a reentrant call.
interface IYieldRouterForAttack {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
}

/// @title MaliciousKinetic
/// @notice Test-only IKinetic implementation that attempts to reenter
///         YieldRouter's deposit/withdraw from within mint()/
///         redeemUnderlying() callbacks. Used exclusively to prove
///         YieldRouter's ReentrancyGuard blocks the reentrant call. Not
///         used in production and not part of the deploy script.
contract MaliciousKinetic is IKinetic {
    /// @notice The YieldRouter instance to attempt to reenter.
    address public router;

    /// @notice Whether to attempt a reentrant deposit() during mint().
    bool public attackOnMint;

    /// @notice Whether to attempt a reentrant withdraw() during
    ///         redeemUnderlying().
    bool public attackOnRedeem;

    /// @notice Sets the router address to attack.
    function setRouter(address _router) external {
        router = _router;
    }

    /// @notice Configures which callback attempts a reentrant call.
    function setAttackMode(bool onMint, bool onRedeem) external {
        attackOnMint = onMint;
        attackOnRedeem = onRedeem;
    }

    /// @notice If attackOnMint is set, attempts to reenter
    ///         YieldRouter.deposit() before returning.
    function mint(uint256 mintAmount) external override returns (uint256) {
        if (attackOnMint) {
            IYieldRouterForAttack(router).deposit(mintAmount);
        }
        return 0;
    }

    /// @notice If attackOnRedeem is set, attempts to reenter
    ///         YieldRouter.withdraw() before returning.
    function redeemUnderlying(uint256 redeemAmount) external override returns (uint256) {
        if (attackOnRedeem) {
            IYieldRouterForAttack(router).withdraw(redeemAmount);
        }
        return 0;
    }

    /// @notice Unused by the attack; present to satisfy IKinetic.
    function supplyRatePerBlock() external pure override returns (uint256) {
        return 0;
    }

    /// @notice Unused by the attack; present to satisfy IKinetic.
    function balanceOf(address) external pure override returns (uint256) {
        return 0;
    }

    /// @notice Unused by the attack; present to satisfy IKinetic.
    function exchangeRateStored() external pure override returns (uint256) {
        return 1e18;
    }
}