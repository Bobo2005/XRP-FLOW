// import type { ActivityItem } from "../data/mockData";

// interface ActivityTableProps {
//   items: ActivityItem[];
// }

// function formatDate(iso: string) {
//   return new Date(iso).toLocaleDateString(undefined, {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// /**
//  * Deposit/withdraw history, structured like a typical exchange holdings
//  * table. Reads from Deposited/Withdrawn contract events once wired up.
//  */
// export default function ActivityTable({ items }: ActivityTableProps) {
//   return (
//     <div className="rounded-xl border border-border bg-bg-base p-6">
//       <h3 className="font-display text-base font-bold">History</h3>

//       {items.length === 0 ? (
//         <p className="mt-4 text-sm text-text-muted">
//           No deposits or withdrawals yet. Your activity will show up here.
//         </p>
//       ) : (
//         <div className="mt-4 overflow-x-auto">
//           <table className="w-full text-left text-sm">
//             <thead>
//               <tr className="border-b border-border text-xs text-text-muted">
//                 <th className="pb-2 pr-4 font-medium">Type</th>
//                 <th className="pb-2 pr-4 font-medium">Amount</th>
//                 <th className="pb-2 pr-4 font-medium">Protocol</th>
//                 <th className="pb-2 pr-4 font-medium">Date</th>
//                 <th className="pb-2 font-medium">Tx</th>
//               </tr>
//             </thead>
//             <tbody>
//               {items.map((item) => (
//                 <tr
//                   key={item.id}
//                   className="border-b border-border last:border-0"
//                 >
//                   <td className="py-3 pr-4">
//                     <span
//                       className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
//                         item.type === "Deposit"
//                           ? "bg-success-green/10 text-success-green"
//                           : "bg-danger-red/10 text-danger-red"
//                       }`}
//                     >
//                       {item.type}
//                     </span>
//                   </td>
//                   <td className="num py-3 pr-4 text-text-primary">
//                     {item.amount.toLocaleString(undefined, {
//                       minimumFractionDigits: 2,
//                       maximumFractionDigits: 2,
//                     })}{" "}
//                     FXRP
//                   </td>
//                   <td className="py-3 pr-4 text-text-muted">
//                     {item.protocol}
//                   </td>
//                   <td className="py-3 pr-4 text-text-muted">
//                     {formatDate(item.timestamp)}
//                   </td>
//                   <td className="num py-3 text-text-muted">{item.txHash}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }

import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { CONTRACTS, isDeployed } from "../contracts";
import { coston2 } from "../wagmi";
import { describeContractError } from "../lib/errors";
import { useActivityHistory } from "../hooks/useActivityHistory";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ActivityTable() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const onCorrectNetwork = chainId === coston2.id;

  const { data: decimalsData } = useReadContract({
    ...CONTRACTS.fxrp,
    functionName: "decimals",
    query: { enabled: isDeployed },
  });
  const decimals = decimalsData ?? 18;

  const { data: items, isLoading, isError, error } = useActivityHistory(decimals);

  return (
    <div className="rounded-xl border border-border bg-bg-base p-4 sm:p-6">
      <h3 className="mb-3 sm:mb-4 font-display text-sm sm:text-base font-bold">
        History
      </h3>

      {!isDeployed ? (
        <StatusNotice>
          Contracts aren't deployed yet — see the APY card above for setup
          steps.
        </StatusNotice>
      ) : !isConnected ? (
        <StatusNotice>Connect your wallet to see your history.</StatusNotice>
      ) : !onCorrectNetwork ? (
        <StatusNotice>
          Switch your wallet to Flare Coston2 (chain ID 114) to see your
          history.
        </StatusNotice>
      ) : isLoading ? (
        <div className="mt-2 sm:mt-4 space-y-1.5 sm:space-y-2">
          <div className="h-6 sm:h-8 w-full animate-pulse rounded bg-bg-surface" />
          <div className="h-6 sm:h-8 w-full animate-pulse rounded bg-bg-surface" />
          <div className="h-6 sm:h-8 w-full animate-pulse rounded bg-bg-surface" />
        </div>
      ) : isError ? (
        <p className="mt-2 sm:mt-4 flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-danger-red">
          <AlertCircle className="h-3.5 sm:h-4 w-3.5 sm:w-4 flex-shrink-0" aria-hidden />
          {describeContractError(error)}
        </p>
      ) : !items || items.length === 0 ? (
        <p className="mt-2 sm:mt-4 text-xs sm:text-sm text-text-muted">
          No deposits or withdrawals yet. Your activity will show up here.
        </p>
      ) : (
        <div className="mt-2 sm:mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border text-xs sm:text-sm text-text-muted">
                <th className="pb-1 sm:pb-2 pr-2 sm:pr-4 font-medium">Type</th>
                <th className="num py-1 sm:py-3 pr-2 sm:pr-4 text-text-primary">
                  Amount
                </th>
                <th className="py-1 sm:py-3 pr-2 sm:pr-4 text-text-muted">
                  Protocol
                </th>
                <th className="py-1 sm:py-3 pr-2 sm:pr-4 text-text-muted">
                  Date
                </th>
                <th className="pb-1 sm:pb-2 font-medium">Tx</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-1 sm:py-3 pr-2 sm:pr-4">
                    <span
                      className={`rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold ${
                        item.type === "Deposit"
                          ? "bg-success-green/10 text-success-green"
                          : "bg-danger-red/10 text-danger-red"
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="num py-1 sm:py-3 pr-2 sm:pr-4 text-text-primary">
                    {item.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    FXRP
                  </td>
                  <td className="py-1 sm:py-3 pr-2 sm:pr-4 text-text-muted">{item.protocol}</td>
                  <td className="py-1 sm:py-3 pr-2 sm:pr-4 text-text-muted">{formatDate(item.timestamp)}</td>
                  <td className="num py-1 sm:py-3 text-text-muted">{item.txHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusNotice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 sm:mt-4 rounded-lg bg-bg-surface p-1.5 sm:p-3 text-xs sm:text-sm text-text-muted">
      {children}
    </p>
  );
}