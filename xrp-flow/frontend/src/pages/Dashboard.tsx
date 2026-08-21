
// import { useEffect, useState } from "react";
// import type { ReactNode } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { useAccount, useChainId, useDisconnect, useReadContracts } from "wagmi";
// import {
//   AlertTriangle,
//   AlertCircle,
//   LogOut,
//   Smartphone,
//   Monitor,
//   MessageSquare,
//   Wallet,
//   Loader2,
//   MapPin,
//   Scan,
// } from "lucide-react";
// import { formatUnits } from "viem";
// import APYComparison from "../components/APYComparison";
// import DepositForm from "../components/DepositForm";
// import ReputationBadge from "../components/ReputationBadge";
// import ActivityTable from "../components/ActivityTable";
// import CompoundInterestChart from "../components/CompoundInterestChart";
// import APYPrediction from "../components/APYPrediction";
// import GasEstimator from "../components/GasEstimator";
// import PerformanceBenchmark from "../components/PerformanceBenchmark";
// import LeaderboardPage from "./LeaderboardPage";
// import AddressBook from "../components/AddressBook";
// import QRScannerModal from "../components/QRScannerModal";
// import { useWallet } from "../hooks/useWallet";
// import { CONTRACTS, isDeployed, tierNameFromIndex } from "../contracts";
// import { coston2 } from "../wagmi";
// import { describeContractError } from "../lib/errors";
// import { useHistoricalData, calculateTierProgress } from "../hooks/useHistoricalData";

// const TABS = ["Dashboard", "Reputation", "History", "Analytics", "Leaderboard", "Address Book"] as const;
// type Tab = (typeof TABS)[number];

// function truncateAddress(address: string) {
//   return `${address.slice(0, 6)}...${address.slice(-4)}`;
// }

// export default function Dashboard() {
//   const navigate = useNavigate();
//   const { address, isConnected } = useAccount();
//   const { disconnect } = useDisconnect();
//   const chainId = useChainId();
//   const wallet = useWallet();
//   const [activeTab, setActiveTab] = useState<Tab>("Dashboard");

//   // Local state for toggling Address Book & QR Scanner modals
//   const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
//   const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

//   useEffect(() => {
//     if (!isConnected) {
//       navigate("/");
//     }
//   }, [isConnected, navigate]);

//   if (!isConnected || !address) {
//     return null;
//   }

//   const onWrongNetwork = chainId !== coston2.id;

//   return (
//     <div className="min-h-screen bg-bg-base">
//       {/* Top bar */}
//       <header className="border-b border-border bg-bg-base/80 backdrop-blur-md sticky top-0 z-10">
//         <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
//           <div className="flex items-center gap-10">
//             <Link
//               to="/"
//               className="font-display text-lg font-extrabold text-text-primary transition-opacity hover:opacity-80"
//             >
//               XRP Flow
//             </Link>
//             <nav className="hidden gap-1 sm:flex" aria-label="Main Navigation">
//               {TABS.map((tab) => (
//                 <button
//                   key={tab}
//                   type="button"
//                   onClick={() => setActiveTab(tab)}
//                   aria-current={activeTab === tab ? "page" : undefined}
//                   className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
//                     activeTab === tab
//                       ? "bg-primary-blue/10 text-primary-blue shadow-sm"
//                       : "text-text-muted hover:bg-bg-surface hover:text-text-primary"
//                   }`}
//                 >
//                   {tab}
//                 </button>
//               ))}
//             </nav>
//           </div>

//           <div className="flex items-center gap-3">
//             <span
//               className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${
//                 onWrongNetwork
//                   ? "bg-danger-red/10 text-danger-red"
//                   : "bg-success-green/10 text-success-green"
//               }`}
//             >
//               {onWrongNetwork && (
//                 <AlertTriangle className="h-3 w-3" aria-hidden />
//               )}
//               {onWrongNetwork ? "Wrong network" : "Coston2"}
//             </span>
//             <span className="num hidden rounded-full border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary sm:inline-block shadow-sm">
//               {truncateAddress(address)}
//             </span>
//             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-blue to-accent-teal text-[10px] font-bold uppercase text-white shadow-sm">
//               {address.slice(2, 4)}
//             </div>
//             <div className="relative">
//               <div className="flex items-center gap-2">
//                 {/* Address Book Button */}
//                 <button
//                   type="button"
//                   onClick={() => setIsAddressBookOpen(true)}
//                   title="Address Book"
//                   aria-label="Address Book"
//                   className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-base text-text-muted transition-all duration-200 hover:border-primary-blue hover:bg-primary-blue/5 hover:text-primary-blue"
//                   disabled={!wallet.account}
//                 >
//                   <MapPin className="h-4 w-4" aria-hidden />
//                 </button>

//                 {/* QR Scanner Button */}
//                 <button
//                   type="button"
//                   onClick={() => setIsQRScannerOpen(true)}
//                   title="QR Scan"
//                   aria-label="QR Scan"
//                   className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-base text-text-muted transition-all duration-200 hover:border-success-green hover:bg-success-green/5 hover:text-success-green"
//                   disabled={!wallet.account}
//                 >
//                   <Scan className="h-4 w-4" aria-hidden />
//                 </button>

//                 {/* Disconnect Button */}
//                 <button
//                   type="button"
//                   onClick={() => disconnect()}
//                   title="Disconnect wallet"
//                   aria-label="Disconnect wallet"
//                   className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-base text-text-muted transition-all duration-200 hover:border-danger-red hover:bg-danger-red/5 hover:text-danger-red"
//                 >
//                   <LogOut className="h-4 w-4" aria-hidden />
//                 </button>
//               </div>

//               {/* Wallet tooltip showing connection details */}
//               {wallet.account && (
//                 <div className="absolute left-0 top-12 w-64 bg-bg-base rounded-lg border border-border p-4 text-xs z-20 shadow-lg transform -translate-x-1/2">
//                   <div className="space-y-2">
//                     <div className="flex items-center gap-2">
//                       <div className="flex-shrink-0">
//                         {wallet.isMetaMask && <Wallet className="h-4 w-4" aria-hidden />}
//                         {wallet.isWalletConnect && <Monitor className="h-4 w-4" aria-hidden />}
//                         {wallet.isCoinbaseWallet && <MessageSquare className="h-4 w-4" aria-hidden />}
//                         {!wallet.isMetaMask && !wallet.isWalletConnect && !wallet.isCoinbaseWallet && (
//                           <Smartphone className="h-4 w-4" aria-hidden />
//                         )}
//                       </div>
//                       <div>
//                         <p className="font-medium">{wallet.walletName || "Connected Wallet"}</p>
//                         <p className="text-muted truncate max-w-xs">
//                           {wallet.account.slice(0, 6)}...{wallet.account.slice(-4)}
//                         </p>
//                       </div>
//                     </div>
//                     {wallet.balance !== null && (
//                       <div className="border-t border-border pt-2">
//                         <p className="font-medium">Balance: {wallet.balance} FXRP</p>
//                       </div>
//                     )}
//                     {!wallet.isOnCorrectNetwork && (
//                       <div className="border-t border-border pt-2">
//                         <button
//                           onClick={() => wallet.switchToCoston2()}
//                           className="w-full text-left text-primary-blue hover:underline font-medium"
//                         >
//                           Switch to Coston2 Network
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Mobile Navigation Bar */}
//         <div className="flex sm:hidden overflow-x-auto gap-2 px-4 pb-3 pt-1 border-t border-border/50 hide-scrollbar">
//           {TABS.map((tab) => (
//             <button
//               key={tab}
//               type="button"
//               onClick={() => setActiveTab(tab)}
//               aria-current={activeTab === tab ? "page" : undefined}
//               className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
//                 activeTab === tab
//                   ? "bg-primary-blue/10 text-primary-blue"
//                   : "text-text-muted hover:bg-bg-surface hover:text-text-primary"
//               }`}
//             >
//               {tab}
//             </button>
//           ))}
//         </div>
//       </header>

//       <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 transition-all duration-300 ease-in-out">
//         {(activeTab === "Dashboard" || activeTab === "Reputation") && (
//           <StatRow address={address} onWrongNetwork={onWrongNetwork} />
//         )}

//         {activeTab === "Dashboard" && (
//           <div className="space-y-6">
//             <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
//               <APYComparison />
//               <DepositForm />
//             </div>
//             <div className="w-full">
//               <ReputationBadge />
//             </div>
//             <div className="w-full">
//               <ActivityTable />
//             </div>
//           </div>
//         )}

//         {activeTab === "Reputation" && (
//           <div className="max-w-2xl mx-auto">
//             <ReputationBadge />
//           </div>
//         )}

//         {activeTab === "Leaderboard" && <LeaderboardPage />}

//         {activeTab === "History" && (
//           <div className="w-full">
//             <ActivityTable />
//           </div>
//         )}

//         {activeTab === "Analytics" && (
//           <div className="space-y-6">
//             <div className="grid gap-6 lg:grid-cols-2">
//               <CompoundInterestChart />
//               <APYPrediction />
//             </div>
//             <div className="grid gap-6 lg:grid-cols-2">
//               <GasEstimator />
//               <PerformanceBenchmark />
//             </div>
//           </div>
//         )}
//       </main>

//       {wallet.account && (
//   <>
//     <AddressBook isOpen={isAddressBookOpen} onClose={() => setIsAddressBookOpen(false)} />
//     <QRScannerModal 
//       isOpen={isQRScannerOpen} 
//       onClose={() => setIsQRScannerOpen(false)} 
//       onScan={(scannedData) => {
//         console.log("Scanned QR:", scannedData);
//         // Handle the scanned address/data here
//       }}
//     />
//   </>
// )}
//     </div>
//   );
// }

// function StatRow({
//   address,
//   onWrongNetwork,
// }: {
//   address: `0x${string}`;
//   onWrongNetwork: boolean;
// }) {
//   const enabled = isDeployed && !onWrongNetwork;

//   const { data, isLoading, isError, error } = useReadContracts({
//     allowFailure: false,
//     contracts: [
//       { ...CONTRACTS.fxrp, functionName: "decimals" },
//       {
//         ...CONTRACTS.yieldRouter,
//         functionName: "deposits",
//         args: [address],
//       },
//       { ...CONTRACTS.yieldRouter, functionName: "getCurrentAPY" },
//       {
//         ...CONTRACTS.yieldRouter,
//         functionName: "getReputationTier",
//         args: [address],
//       },
//       { ...CONTRACTS.yieldRouter, functionName: "bronzeThreshold" },
//       { ...CONTRACTS.yieldRouter, functionName: "silverThreshold" },
//       { ...CONTRACTS.yieldRouter, functionName: "goldThreshold" },
//     ],
//     query: { enabled },
//   });

//   const {
//     data: historicalData,
//     isLoading: historicalLoading,
//     error: historicalError,
//   } = useHistoricalData();

//   if (!isDeployed) {
//     return (
//       <StatNotice>
//         Contracts aren't deployed yet — see the APY card below for setup steps.
//       </StatNotice>
//     );
//   }
//   if (onWrongNetwork) {
//     return (
//       <StatNotice>
//         Switch your wallet to Flare Coston2 (chain ID 114) to see your stats.
//       </StatNotice>
//     );
//   }
//   if (isLoading || !data) {
//     return (
//       <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//         {Array.from({ length: 4 }).map((_, i) => (
//           <div
//             key={i}
//             className="h-24 animate-pulse rounded-xl border border-border bg-bg-surface"
//           />
//         ))}
//       </div>
//     );
//   }
//   if (isError) {
//     return (
//       <div className="mb-8 flex items-center gap-2 rounded-lg border border-danger-red/30 bg-danger-red/10 p-4 text-sm text-danger-red">
//         <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden />
//         <p>{describeContractError(error)}</p>
//       </div>
//     );
//   }

//   const [decimals, depositRecord, rawApy, tierRaw, bronzeThreshold, silverThreshold, goldThreshold] =
//     data as unknown as [
//       number,
//       readonly [bigint, bigint],
//       bigint,
//       number | bigint,
//       bigint,
//       bigint,
//       bigint
//     ];

//   const totalDeposited = Number(formatUnits(depositRecord[0], decimals));
//   const currentBestApy = Number(formatUnits(rawApy, 18)) * 100;
//   const reputationTier = tierNameFromIndex(Number(tierRaw));
//   const estimatedAnnualYield = totalDeposited * (currentBestApy / 100);

//   // Scaled tier calculation to preserve sub-day accuracy
//   const depositAmount = depositRecord[0];
//   const daysHeld =
//     depositRecord[1] > 0
//       ? Math.max(0, (Date.now() / 1000 - Number(depositRecord[1])) / 86400)
//       : 0;
//   const currentScore = (depositAmount * BigInt(Math.floor(daysHeld * 1000))) / 1000n;

//   const tierProgress = calculateTierProgress(
//     currentScore,
//     bronzeThreshold,
//     silverThreshold,
//     goldThreshold
//   );

//   const getTierProgressClassName = (progress: number): string => {
//     return progress >= 80
//       ? "text-success-green"
//       : progress >= 50
//       ? "text-warning-amber"
//       : "text-text-muted";
//   };

//   // Find dynamic max APY for chart bar scaling
//   const maxHistoricalAPY = Math.max(
//     10,
//     ...(historicalData?.apyHistory?.map((p) => Math.max(p.kineticAPY, p.morphoAPY, p.bestAPY)) || [10])
//   );

//   return (
//     <>
//       <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//         <StatCard
//           label="Total Deposited"
//           value={`${totalDeposited.toLocaleString(undefined, {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2,
//           })} FXRP`}
//         />
//         <StatCard
//           label="Current Best APY"
//           value={`${currentBestApy.toFixed(2)}%`}
//           valueClassName="text-success-green"
//         />
//         <StatCard label="Reputation Tier" value={reputationTier} />
//         <StatCard
//           label="Est. Annual Yield"
//           value={`${estimatedAnnualYield.toLocaleString(undefined, {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2,
//           })} FXRP`}
//         />
//       </div>

//       <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//         <StatCard
//           label="To Next Tier"
//           value={`${tierProgress.progressToNext}%`}
//           valueClassName={getTierProgressClassName(tierProgress.progressToNext)}
//         >
//           {tierProgress.nextTierName}
//         </StatCard>
//         <StatCard
//           label="Monthly Yield"
//           value={`${(estimatedAnnualYield / 12).toLocaleString(undefined, {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2,
//           })} FXRP`}
//         />
//         <StatCard
//           label="Weekly Yield"
//           value={`${(estimatedAnnualYield / 52).toLocaleString(undefined, {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2,
//           })} FXRP`}
//         />
//         <StatCard
//           label="Daily Yield"
//           value={`${(estimatedAnnualYield / 365).toLocaleString(undefined, {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2,
//           })} FXRP`}
//         />
//       </div>

//       {/* Historical APY Trend */}
//       <div className="mb-6 sm:mb-8">
//         <h3 className="mb-3 sm:mb-4 font-display text-base font-bold text-text-primary flex items-center gap-2">
//           APY Trend (24h)
//         </h3>
//         <div className="rounded-xl border border-border bg-bg-base p-4 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md">
//           {historicalLoading ? (
//             <div className="text-center py-6 sm:py-8">
//               <div className="h-5 w-5 animate-pulse rounded-full bg-bg-surface mx-auto mb-3 sm:mb-4"></div>
//               <p className="text-sm text-text-muted">Loading historical data...</p>
//             </div>
//           ) : historicalError ? (
//             <p className="text-center text-danger-red text-sm py-4">
//               Error loading historical data: {historicalError?.message || "Unknown error"}
//             </p>
//           ) : Array.isArray(historicalData?.apyHistory) && historicalData.apyHistory.length > 0 ? (
//             <div className="relative w-full max-h-[350px] overflow-y-auto pr-2 styled-scrollbar">
//               <div className="flex flex-col gap-5">
//                 {historicalData.apyHistory.map((point, index) => {
//                   const isLast = index === historicalData.apyHistory.length - 1;
//                   const kineticWidth = Math.min(100, (point.kineticAPY / maxHistoricalAPY) * 100);
//                   const morphoWidth = Math.min(100, (point.morphoAPY / maxHistoricalAPY) * 100);
//                   const bestWidth = Math.min(100, (point.bestAPY / maxHistoricalAPY) * 100);

//                   return (
//                     <div key={index} className="flex flex-col gap-1.5 w-full">
//                       <div className="flex justify-between items-center text-xs text-text-muted">
//                         <span className="font-medium">
//                           {new Date(point.timestamp).toLocaleTimeString([], {
//                             hour: "2-digit",
//                             minute: "2-digit",
//                           })}
//                         </span>
//                         <span className="font-mono text-[11px] text-text-primary bg-bg-surface px-1.5 py-0.5 rounded">
//                           Best: {point.bestAPY.toFixed(2)}%
//                         </span>
//                       </div>

//                       <div className="grid grid-cols-3 gap-2 h-3.5 bg-bg-surface/50 rounded-md p-0.5 border border-border/50">
//                         <div className="w-full bg-bg-surface rounded-sm overflow-hidden">
//                           <div
//                             className="h-full bg-primary-blue transition-all duration-500 ease-in-out"
//                             style={{ width: `${kineticWidth}%` }}
//                             title={`Kinetic: ${point.kineticAPY.toFixed(2)}%`}
//                           />
//                         </div>
//                         <div className="w-full bg-bg-surface rounded-sm overflow-hidden">
//                           <div
//                             className="h-full bg-success-green transition-all duration-500 ease-in-out"
//                             style={{ width: `${morphoWidth}%` }}
//                             title={`Morpho: ${point.morphoAPY.toFixed(2)}%`}
//                           />
//                         </div>
//                         <div className="w-full bg-bg-surface rounded-sm overflow-hidden">
//                           <div
//                             className="h-full bg-accent-teal transition-all duration-500 ease-in-out"
//                             style={{ width: `${bestWidth}%` }}
//                             title={`Best: ${point.bestAPY.toFixed(2)}%`}
//                           />
//                         </div>
//                       </div>

//                       {isLast && (
//                         <div className="mt-1 flex justify-between w-full text-[11px] font-medium text-text-muted">
//                           <span className="text-primary-blue flex items-center gap-1">
//                             <span className="w-1.5 h-1.5 rounded-full bg-primary-blue inline-block"></span>
//                             Kinetic: {point.kineticAPY.toFixed(2)}%
//                           </span>
//                           <span className="text-success-green flex items-center gap-1">
//                             <span className="w-1.5 h-1.5 rounded-full bg-success-green inline-block"></span>
//                             Morpho: {point.morphoAPY.toFixed(2)}%
//                           </span>
//                           <span className="text-accent-teal flex items-center gap-1">
//                             <span className="w-1.5 h-1.5 rounded-full bg-accent-teal inline-block"></span>
//                             Best: {point.bestAPY.toFixed(2)}%
//                           </span>
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           ) : (
//             <p className="text-center text-text-muted py-6 sm:py-8 text-sm">
//               No historical data available
//             </p>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

// function StatNotice({ children }: { children: ReactNode }) {
//   return (
//     <div className="mb-6 sm:mb-8 rounded-lg border border-border/60 bg-bg-surface/50 p-3 sm:p-4 text-sm text-text-muted shadow-sm">
//       {children}
//     </div>
//   );
// }

// function StatCard({
//   label,
//   value,
//   valueClassName = "text-text-primary",
//   children,
// }: {
//   label: string;
//   value: string;
//   valueClassName?: string;
//   children?: ReactNode;
// }) {
//   return (
//     <div className="group rounded-xl border border-border bg-bg-base p-4 sm:p-5 shadow-sm transition-all duration-200 hover:border-primary-blue/30 hover:shadow-md">
//       <p className="text-xs sm:text-sm font-medium text-text-muted group-hover:text-text-primary/80 transition-colors">
//         {label}
//       </p>
//       <p className={`num mt-2 sm:mt-1.5 text-base sm:text-xl font-bold tracking-tight ${valueClassName}`}>
//         {value}
//       </p>
//       {children && (
//         <p className="mt-2 sm:mt-1.5 text-xs sm:text-sm text-text-muted font-medium">
//           {children}
//         </p>
//       )}
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccount, useChainId, useDisconnect, useReadContracts } from "wagmi";
import {
  AlertTriangle,
  AlertCircle,
  LogOut,
  Smartphone,
  Monitor,
  MessageSquare,
  Wallet,
  MapPin,
  Scan,
} from "lucide-react";
import { formatUnits } from "viem";
import APYComparison from "../components/APYComparison";
import DepositForm from "../components/DepositForm";
import ReputationBadge from "../components/ReputationBadge";
import ActivityTable from "../components/ActivityTable";
import CompoundInterestChart from "../components/CompoundInterestChart";
import APYPrediction from "../components/APYPrediction";
import GasEstimator from "../components/GasEstimator";
import PerformanceBenchmark from "../components/PerformanceBenchmark";
import LeaderboardPage from "./LeaderboardPage";
import AddressBook from "../components/AddressBook";
import QRScannerModal from "../components/QRScannerModal";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS, isDeployed, tierNameFromIndex } from "../contracts";
import { coston2 } from "../wagmi";
import { describeContractError } from "../lib/errors";
import { useHistoricalData, calculateTierProgress } from "../hooks/useHistoricalData";

const TABS = ["Dashboard", "Reputation", "History", "Analytics", "Leaderboard", "Address Book"] as const;
type Tab = (typeof TABS)[number];

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");

  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  if (!isConnected || !address) {
    return null;
  }

  const onWrongNetwork = chainId !== coston2.id;

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Top bar */}
      <header className="border-b border-border bg-bg-base/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-10">
            <Link
              to="/"
              className="font-display text-lg font-extrabold text-text-primary transition-opacity hover:opacity-80"
            >
              XRP Flow
            </Link>
            <nav className="hidden gap-1 sm:flex" aria-label="Main Navigation">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-current={activeTab === tab ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-primary-blue/10 text-primary-blue shadow-sm"
                      : "text-text-muted hover:bg-bg-surface hover:text-text-primary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${
                onWrongNetwork
                  ? "bg-danger-red/10 text-danger-red"
                  : "bg-success-green/10 text-success-green"
              }`}
            >
              {onWrongNetwork && <AlertTriangle className="h-3 w-3" aria-hidden />}
              {onWrongNetwork ? "Wrong network" : "Coston2"}
            </span>
            <span className="num hidden rounded-full border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary sm:inline-block shadow-sm">
              {truncateAddress(address)}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-blue to-accent-teal text-[10px] font-bold uppercase text-white shadow-sm">
              {address.slice(2, 4)}
            </div>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddressBookOpen(true)}
                title="Address Book"
                aria-label="Address Book"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-base text-text-muted transition-all duration-200 hover:border-primary-blue hover:bg-primary-blue/5 hover:text-primary-blue"
                disabled={!wallet.account}
              >
                <MapPin className="h-4 w-4" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => setIsQRScannerOpen(true)}
                title="QR Scan"
                aria-label="QR Scan"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-base text-text-muted transition-all duration-200 hover:border-success-green hover:bg-success-green/5 hover:text-success-green"
                disabled={!wallet.account}
              >
                <Scan className="h-4 w-4" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => disconnect()}
                title="Disconnect wallet"
                aria-label="Disconnect wallet"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-base text-text-muted transition-all duration-200 hover:border-danger-red hover:bg-danger-red/5 hover:text-danger-red"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex sm:hidden overflow-x-auto gap-2 px-4 pb-3 pt-1 border-t border-border/50 hide-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary-blue/10 text-primary-blue"
                  : "text-text-muted hover:bg-bg-surface hover:text-text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 transition-all duration-300 ease-in-out">
        {(activeTab === "Dashboard" || activeTab === "Reputation") && (
          <StatRow address={address} onWrongNetwork={onWrongNetwork} />
        )}

        {activeTab === "Dashboard" && (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              <APYComparison />
              <DepositForm />
            </div>
            <div className="w-full">
              <ReputationBadge />
            </div>
            <div className="w-full">
              <ActivityTable />
            </div>
          </div>
        )}

        {activeTab === "Reputation" && (
          <div className="max-w-2xl mx-auto">
            <ReputationBadge />
          </div>
        )}

        {activeTab === "Leaderboard" && <LeaderboardPage />}

        {activeTab === "History" && (
          <div className="w-full">
            <ActivityTable />
          </div>
        )}

        {activeTab === "Analytics" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <CompoundInterestChart />
              <APYPrediction />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <GasEstimator />
              <PerformanceBenchmark />
            </div>
          </div>
        )}

        {activeTab === "Address Book" && (
          <div className="w-full">
            <AddressBook isOpen={true} onClose={() => setActiveTab("Dashboard")} />
          </div>
        )}
      </main>

      {/* {wallet.account && (
        <>
          <AddressBook isOpen={isAddressBookOpen} onClose={() => setIsAddressBookOpen(false)} />
          <QRScannerModal 
            isOpen={isQRScannerOpen} 
            onClose={() => setIsQRScannerOpen(false)} 
            onScan={(scannedData) => {
              console.log("Scanned QR:", scannedData);
            }}
          />
        </>
      )} */}
    </div>
  );
}

function StatRow({ address, onWrongNetwork }: { address: `0x${string}`; onWrongNetwork: boolean }) {
  const enabled = isDeployed && !onWrongNetwork;

  const { data, isLoading, isError, error } = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...CONTRACTS.fxrp, functionName: "decimals" },
      { ...CONTRACTS.yieldRouter, functionName: "deposits", args: [address] },
      { ...CONTRACTS.yieldRouter, functionName: "getCurrentAPY" },
      { ...CONTRACTS.yieldRouter, functionName: "getReputationTier", args: [address] },
      { ...CONTRACTS.yieldRouter, functionName: "bronzeThreshold" },
      { ...CONTRACTS.yieldRouter, functionName: "silverThreshold" },
      { ...CONTRACTS.yieldRouter, functionName: "goldThreshold" },
    ],
    query: { enabled },
  });

  const { data: historicalData, isLoading: historicalLoading, error: historicalError } = useHistoricalData();

  if (!isDeployed) {
    return <StatNotice>Contracts aren't deployed yet — see the APY card below for setup steps.</StatNotice>;
  }
  if (onWrongNetwork) {
    return <StatNotice>Switch your wallet to Flare Coston2 (chain ID 114) to see your stats.</StatNotice>;
  }
  if (isLoading || !data) {
    return (
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-bg-surface" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mb-8 flex items-center gap-2 rounded-lg border border-danger-red/30 bg-danger-red/10 p-4 text-sm text-danger-red">
        <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden />
        <p>{describeContractError(error)}</p>
      </div>
    );
  }

  const [decimals, depositRecord, rawApy, tierRaw, bronzeThreshold, silverThreshold, goldThreshold] =
    data as unknown as [number, readonly [bigint, bigint], bigint, number | bigint, bigint, bigint, bigint];

  const totalDeposited = Number(formatUnits(depositRecord[0], decimals));
  const currentBestApy = Number(formatUnits(rawApy, 18)) * 100;
  const reputationTier = tierNameFromIndex(Number(tierRaw));
  const estimatedAnnualYield = totalDeposited * (currentBestApy / 100);

  const depositAmount = depositRecord[0];
  const daysHeld =
    depositRecord[1] > 0 ? Math.max(0, (Date.now() / 1000 - Number(depositRecord[1])) / 86400) : 0;
  const currentScore = (depositAmount * BigInt(Math.floor(daysHeld * 1000))) / 1000n;

  const tierProgress = calculateTierProgress(currentScore, bronzeThreshold, silverThreshold, goldThreshold);

  const getTierProgressClassName = (progress: number): string => {
    return progress >= 80 ? "text-success-green" : progress >= 50 ? "text-warning-amber" : "text-text-muted";
  };

  const maxHistoricalAPY = Math.max(
    10,
    ...(historicalData?.apyHistory?.map((p) => Math.max(p.kineticAPY, p.morphoAPY, p.bestAPY)) || [10])
  );

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Deposited" value={`${totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FXRP`} />
        <StatCard label="Current Best APY" value={`${currentBestApy.toFixed(2)}%`} valueClassName="text-success-green" />
        <StatCard label="Reputation Tier" value={reputationTier} />
        <StatCard label="Est. Annual Yield" value={`${estimatedAnnualYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FXRP`} />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="To Next Tier" value={`${tierProgress.progressToNext}%`} valueClassName={getTierProgressClassName(tierProgress.progressToNext)}>
          {tierProgress.nextTierName}
        </StatCard>
        <StatCard label="Monthly Yield" value={`${(estimatedAnnualYield / 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FXRP`} />
        <StatCard label="Weekly Yield" value={`${(estimatedAnnualYield / 52).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FXRP`} />
        <StatCard label="Daily Yield" value={`${(estimatedAnnualYield / 365).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FXRP`} />
      </div>

      <div className="mb-6 sm:mb-8">
        <h3 className="mb-3 sm:mb-4 font-display text-base font-bold text-text-primary flex items-center gap-2">
          APY Trend (24h)
        </h3>
        <div className="rounded-xl border border-border bg-bg-base p-4 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          {historicalLoading ? (
            <div className="text-center py-6 sm:py-8">
              <div className="h-5 w-5 animate-pulse rounded-full bg-bg-surface mx-auto mb-3 sm:mb-4"></div>
              <p className="text-sm text-text-muted">Loading historical data...</p>
            </div>
          ) : historicalError ? (
            <p className="text-center text-danger-red text-sm py-4">
              Error loading historical data: {historicalError?.message || "Unknown error"}
            </p>
          ) : Array.isArray(historicalData?.apyHistory) && historicalData.apyHistory.length > 0 ? (
            <div className="relative w-full max-h-[350px] overflow-y-auto pr-2 styled-scrollbar">
              <div className="flex flex-col gap-5">
                {historicalData.apyHistory.map((point, index) => {
                  const isLast = index === historicalData.apyHistory.length - 1;
                  const kineticWidth = Math.min(100, (point.kineticAPY / maxHistoricalAPY) * 100);
                  const morphoWidth = Math.min(100, (point.morphoAPY / maxHistoricalAPY) * 100);
                  const bestWidth = Math.min(100, (point.bestAPY / maxHistoricalAPY) * 100);

                  return (
                    <div key={index} className="flex flex-col gap-1.5 w-full">
                      <div className="flex justify-between items-center text-xs text-text-muted">
                        <span className="font-medium">
                          {new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="font-mono text-[11px] text-text-primary bg-bg-surface px-1.5 py-0.5 rounded">
                          Best: {point.bestAPY.toFixed(2)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 h-3.5 bg-bg-surface/50 rounded-md p-0.5 border border-border/50">
                        <div className="w-full bg-bg-surface rounded-sm overflow-hidden">
                          <div className="h-full bg-primary-blue transition-all duration-500 ease-in-out" style={{ width: `${kineticWidth}%` }} />
                        </div>
                        <div className="w-full bg-bg-surface rounded-sm overflow-hidden">
                          <div className="h-full bg-success-green transition-all duration-500 ease-in-out" style={{ width: `${morphoWidth}%` }} />
                        </div>
                        <div className="w-full bg-bg-surface rounded-sm overflow-hidden">
                          <div className="h-full bg-accent-teal transition-all duration-500 ease-in-out" style={{ width: `${bestWidth}%` }} />
                        </div>
                      </div>

                      {isLast && (
                        <div className="mt-1 flex justify-between w-full text-[11px] font-medium text-text-muted">
                          <span className="text-primary-blue flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-blue inline-block"></span>
                            Kinetic: {point.kineticAPY.toFixed(2)}%
                          </span>
                          <span className="text-success-green flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-green inline-block"></span>
                            Morpho: {point.morphoAPY.toFixed(2)}%
                          </span>
                          <span className="text-accent-teal flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-teal inline-block"></span>
                            Best: {point.bestAPY.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center text-text-muted py-6 sm:py-8 text-sm">No historical data available</p>
          )}
        </div>
      </div>
    </>
  );
}

function StatNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 sm:mb-8 rounded-lg border border-border/60 bg-bg-surface/50 p-3 sm:p-4 text-sm text-text-muted shadow-sm">
      {children}
    </div>
  );
}

function StatCard({ label, value, valueClassName = "text-text-primary", children }: { label: string; value: string; valueClassName?: string; children?: ReactNode }) {
  return (
    <div className="group rounded-xl border border-border bg-bg-base p-4 sm:p-5 shadow-sm transition-all duration-200 hover:border-primary-blue/30 hover:shadow-md">
      <p className="text-xs sm:text-sm font-medium text-text-muted group-hover:text-text-primary/80 transition-colors">{label}</p>
      <p className={`num mt-2 sm:mt-1.5 text-base sm:text-xl font-bold tracking-tight ${valueClassName}`}>{value}</p>
      {children && <p className="mt-2 sm:mt-1.5 text-xs sm:text-sm text-text-muted font-medium">{children}</p>}
    </div>
  );
}