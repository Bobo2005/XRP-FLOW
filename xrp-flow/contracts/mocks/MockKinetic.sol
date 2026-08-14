// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IKinetic} from "../interfaces/IKinetic.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MockKinetic
/// @notice A well-behaved mock of Kinetic Market's kToken money market,
///         used to exercise YieldRouter in tests without a real Kinetic
///         deployment. Matches IKinetic's real Compound-v2-style ABI.
/// @dev Does not move tokens — YieldRouter currently retains custody of
///      FXRP itself (see the TODOs in IKinetic and YieldRouter), so this
///      mock only needs to track supplied amounts and satisfy the
///      interface. Exchange rate is fixed at 1:1 for simplicity — this
///      mock does not model kToken value accrual. Not used in production.
contract MockKinetic is IKinetic {
    /// @notice The FXRP token contract that this mock holds and transfers.
    IERC20 public fxrpToken;

    /// @notice Tracks the amount each caller has supplied for bookkeeping.
    /// @dev Doubles as the mock "kToken balance" via balanceOf(), since the
    ///      exchange rate is fixed at 1e18.
    mapping(address => uint256) public supplied;

    /// @notice Mock per-block supply rate returned by supplyRatePerBlock(),
    ///         settable for tests.
    uint256 public mockRatePerBlock;

    /// @dev Constructor takes the FXRP token contract address.
    constructor(address _fxrpToken) {
        fxrpToken = IERC20(_fxrpToken);
    }

    /// @notice Mints kTokens 1:1 for the supplied amount and records it.
    /// @param mintAmount The amount being supplied.
    /// @return errorCode Always 0 (success) for this mock.
    function mint(uint256 mintAmount) external override returns (uint256 errorCode) {
        // Transfer the underlying tokens from the caller (router) to this contract.
        require(fxrpToken.transferFrom(msg.sender, address(this), mintAmount), "FXRP transfer failed");
        supplied[msg.sender] += mintAmount;
        return 0;
    }

    /// @notice Redeems `redeemAmount` of the underlying, reverting if the
    ///         caller hasn't supplied enough.
    /// @dev Real Compound v2 markets return a non-zero error code instead
    ///      of reverting on failure; this mock reverts instead, since
    ///      YieldRouter already checks the user's own accounting before
    ///      calling this and a revert here would only ever indicate an
    ///      accounting bug worth surfacing loudly.
    /// @param redeemAmount The amount being withdrawn.
    /// @return errorCode Always 0 (success) if it doesn't revert.
    function redeemUnderlying(uint256 redeemAmount)
        external
        override
        returns (uint256 errorCode)
    {
        require(supplied[msg.sender] >= redeemAmount, "MockKinetic: insufficient supplied");
        supplied[msg.sender] -= redeemAmount;
        // Transfer the underlying tokens from this contract to the caller (router).
        require(fxrpToken.transfer(msg.sender, redeemAmount), "FXRP transfer failed");
        return 0;
    }

    /// @notice Returns the mock per-block rate set via setMockRatePerBlock().
    function supplyRatePerBlock() external view override returns (uint256) {
        return mockRatePerBlock;
    }

    /// @notice Returns the caller's mock kToken balance (1:1 with supplied,
    ///         since exchangeRateStored() is fixed at 1e18).
    function balanceOf(address account) external view override returns (uint256) {
        return supplied[account];
    }

    /// @notice Fixed 1:1 exchange rate — this model doesn't model accrual.
    function exchangeRateStored() external pure override returns (uint256) {
        return 1e18;
    }

    /// @notice Test helper to configure the mock per-block rate.
    /// @param ratePerBlock The rate to return, scaled by 1e18.
    function setMockRatePerBlock(uint256 ratePerBlock) external {
        mockRatePerBlock = ratePerBlock;
    }
}