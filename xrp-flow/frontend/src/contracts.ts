import { parseAbi, zeroAddress } from "viem";
import deployedAddresses from "./deployed-addresses.json";
/**
 * Minimal ABI for YieldRouter, hand-written from contracts/YieldRouter.sol
 * (the project hasn't been compiled with network access yet, so this
 * mirrors the source directly rather than an artifact). Keep in sync with
 * the contract if its public interface changes.
 */
export const yieldRouterAbi = parseAbi([
  "function deposit(uint256 amount)",
  "function depositToVenue(uint256 amount, uint8 venue)",
  "function withdraw(uint256 amount)",
"function rebalance()",
  "function getReputationTier(address user) view returns (uint8)",
  "function getCurrentAPY() view returns (uint256)",
  "function kineticMockAPY() view returns (uint256)",
  "function morphoMockAPY() view returns (uint256)",
  "function deposits(address) view returns (uint256 amount, uint256 timestamp)",
  "function bronzeThreshold() view returns (uint256)",
  "function silverThreshold() view returns (uint256)",
  "function goldThreshold() view returns (uint256)",
  "function getBestVenue() view returns (uint8)",
  "function userVenue(address) view returns (uint8)",
  "function morphoMarketParams() view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)",
  "error ZeroAmount()",
  "error InsufficientDeposit(uint256 requested, uint256 available)",
  "error KineticCallFailed(uint256 errorCode)",
  "error MorphoMarketNotConfigured()",
  "error MorphoMarketAlreadyConfigured()",
  "error VenueMismatch(uint8 existing, uint8 requested)",
  "error NoRebalanceNeeded()",
  "event Deposited(address indexed user, uint256 amount, uint256 newTotal, uint8 venue)",
  "event Withdrawn(address indexed user, uint256 amount, uint256 remaining, uint8 venue)",
  "event MockAPYUpdated(uint8 indexed venue, uint256 newAPY)",
]);

/**
 * Minimal ERC20 ABI, used for the FXRP token (MockFXRP on Coston2 for now).
 */
export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

/** Reputation tier as returned by YieldRouter.getReputationTier(). */
export const REPUTATION_TIERS = ["None", "Bronze", "Silver", "Gold"] as const;
export type ReputationTierName = (typeof REPUTATION_TIERS)[number];

export function tierNameFromIndex(index: number): ReputationTierName {
  return REPUTATION_TIERS[index] ?? "None";
}

/** Venue as returned by YieldRouter.getBestVenue() / emitted in events. */
export const VENUES = ["Kinetic", "Morpho"] as const;
export type VenueName = (typeof VENUES)[number];

export function venueNameFromIndex(index: number): VenueName {
  return VENUES[index] ?? "Kinetic";
}

const addresses = deployedAddresses.contracts;

/**
 * True once real addresses have been dropped in (see
 * frontend/README.md — "Connecting to a deployment"). False against the
 * placeholder file shipped in the repo.
 */
export const isDeployed =
  addresses.YieldRouter !== zeroAddress && addresses.MockFXRP !== zeroAddress;

export const CONTRACTS = {
  yieldRouter: {
    address: addresses.YieldRouter as `0x${string}`,
    abi: yieldRouterAbi,
  },
  fxrp: {
    address: addresses.MockFXRP as `0x${string}`,
    abi: erc20Abi,
  },
} as const;

export const deploymentInfo = {
  network: deployedAddresses.network,
  chainId: deployedAddresses.chainId,
  deployedAt: deployedAddresses.deployedAt,
  // Older deployed-addresses.json files (from before this field existed)
  // won't have it — fall back to null, which callers treat as "scan from
  // the start of the chain."
  deployBlock:
    "deployBlock" in deployedAddresses
      ? (deployedAddresses.deployBlock as number | null)
      : null,
};