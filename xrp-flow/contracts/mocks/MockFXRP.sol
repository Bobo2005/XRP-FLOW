// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockFXRP
/// @notice A simple mintable ERC20 token used to stand in for FXRP during
///         local development and testing. Not used in production.
contract MockFXRP is ERC20 {
    /// @notice Deploys the mock token with an initial supply minted to the
    ///         deployer.
    /// @param initialSupply The amount of tokens (in wei, 18 decimals) to
    ///        mint to `msg.sender` on deployment.
    constructor(uint256 initialSupply) ERC20("Mock FXRP", "mFXRP") {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Mints `amount` of mFXRP to `to`. Unrestricted — for testing
    ///         only, so any test account can fund itself.
    /// @param to The address to receive the newly minted tokens.
    /// @param amount The amount of tokens (in wei, 18 decimals) to mint.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}