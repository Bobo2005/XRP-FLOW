// export type ActivityType = "Deposit" | "Withdraw";

// export interface ActivityItem {
//   id: string;
//   type: ActivityType;
//   amount: number;
//   protocol: "Kinetic";
//   timestamp: string; // ISO string
//   txHash: string;
// } 

export type ActivityType = "Deposit" | "Withdraw";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  amount: number;
  protocol: "Kinetic" | "Morpho";
  timestamp: string; // ISO string
  txHash: string;
}