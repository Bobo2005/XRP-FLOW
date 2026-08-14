/**
 * Placeholder data for the static frontend build (Step 4).
 * Replaced with live values read from YieldRouter in Step 5.
 */

export type ReputationTier = "None" | "Bronze" | "Silver" | "Gold";

export interface ProtocolAPY {
  protocol: "Kinetic" | "Morpho";
  apy: number; // percent, e.g. 4.8 = 4.8%
  isBest: boolean;
}

export const mockApyData: ProtocolAPY[] = [
  { protocol: "Kinetic", apy: 4.82, isBest: true },
  { protocol: "Morpho", apy: 4.31, isBest: false },
];

export interface DashboardStats {
  totalDeposited: number; // FXRP
  currentBestApy: number; // percent
  reputationTier: ReputationTier;
  estimatedAnnualYield: number; // FXRP
}

export const mockStats: DashboardStats = {
  totalDeposited: 1250.42,
  currentBestApy: 4.82,
  reputationTier: "Silver",
  estimatedAnnualYield: 60.27,
};

export const mockReputation = {
  tier: "Silver" as ReputationTier,
  // Progress toward the next tier, 0-100.
  progressToNext: 62,
  nextTier: "Gold" as ReputationTier,
  amountHeld: 1250.42,
  daysHeld: 34,
};

export type ActivityType = "Deposit" | "Withdraw";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  amount: number;
  protocol: "Kinetic" | "Morpho";
  timestamp: string; // ISO string
  txHash: string;
}

export const mockActivity: ActivityItem[] = [
  {
    id: "1",
    type: "Deposit",
    amount: 500,
    protocol: "Kinetic",
    timestamp: "2026-07-29T14:12:00Z",
    txHash: "0x4f2a...9c31",
  },
  {
    id: "2",
    type: "Deposit",
    amount: 750.42,
    protocol: "Kinetic",
    timestamp: "2026-07-15T09:03:00Z",
    txHash: "0x8b71...2ee0",
  },
  {
    id: "3",
    type: "Withdraw",
    amount: 120,
    protocol: "Kinetic",
    timestamp: "2026-06-30T18:45:00Z",
    txHash: "0x1d09...77af",
  },
  {
    id: "4",
    type: "Deposit",
    amount: 120,
    protocol: "Kinetic",
    timestamp: "2026-06-28T11:20:00Z",
    txHash: "0xa03c...44b2",
  },
];