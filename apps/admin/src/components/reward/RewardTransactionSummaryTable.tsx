"use client";

import { useCallback, useEffect, useState } from "react";

import NoData from "@/components/common/NoData";
import { adminPayoutStatusClass } from "@/lib/adminPayoutStatus";
import { formatDateTime } from "@/lib/dateFormat";
import { formatMoney } from "@/lib/currencyFormat";
import {
  loadRewardTransactions,
  type RewardTransactionRecord,
} from "@/lib/rewardTransactionStorage";

type RewardTransactionSummaryTableProps = {
  refreshToken?: number;
};

export function RewardTransactionSummaryTable({
  refreshToken = 0,
}: RewardTransactionSummaryTableProps) {
  const [entries, setEntries] = useState<RewardTransactionRecord[]>([]);

  const refresh = useCallback(() => {
    setEntries(loadRewardTransactions());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshToken]);

  return (
    <div className="border-t border-gray-100 px-6 py-6 dark:border-gray-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Reward transactions
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Summary of rewards created from this page. Status shows whether the
            reward is pending approval, given, scheduled, or failed.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline"
        >
          Refresh
        </button>
      </div>

      {entries.length === 0 ? (
        <NoData>
          No reward transactions yet. Create a reward above to see it listed
          here.
        </NoData>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Reward
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Given
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-transparent">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white/90">
                    <div className="font-medium">{entry.rewardName}</div>
                    {entry.errorMessage ? (
                      <div className="mt-1 text-xs text-error-600 dark:text-error-400">
                        {entry.errorMessage}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {entry.rewardUser}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {formatMoney(entry.rewardAmount, entry.rewardCurrency)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${adminPayoutStatusClass(entry.payoutStatus)}`}
                    >
                      {entry.payoutStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {entry.givenAt ? formatDateTime(entry.givenAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
