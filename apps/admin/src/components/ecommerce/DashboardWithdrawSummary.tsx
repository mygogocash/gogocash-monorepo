"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon } from "@/icons";
import { formatDateTime } from "@/lib/dateFormat";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  MOCK_DASHBOARD_SUMMARY,
  fetchDashboardWithdrawSummary,
  isRealApiConfigured,
} from "@/lib/query/dashboardQueries";
import {
  withdrawListHref,
  type WithdrawStatusFilter,
} from "@/lib/withdrawStatusFilter";

export function DashboardWithdrawSummary() {
  const hasRealApi = isRealApiConfigured();
  const {
    data: summary,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["dashboard", "withdraw-summary"],
    queryFn: fetchDashboardWithdrawSummary,
    staleTime: 60_000,
  });

  const displaySummary =
    summary ?? (hasRealApi ? null : MOCK_DASHBOARD_SUMMARY);
  const pendingCount = displaySummary?.withdrawByStatus?.pending?.count ?? 0;
  const showAttention = pendingCount > 0;

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (hasRealApi && isError) {
    return (
      <p
        role="alert"
        className="border-error-200 bg-error-50 text-error-800 dark:border-error-800 dark:bg-error-950/30 dark:text-error-200 rounded-xl border px-4 py-3 text-sm"
      >
        {getApiErrorMessage(
          error,
          "Could not load withdraw summary. Refresh the page or check your connection.",
        )}
      </p>
    );
  }

  const byStatus = displaySummary?.withdrawByStatus ?? {
    pending: { count: 0, total: 0 },
    approved: { count: 0, total: 0 },
    rejected: { count: 0, total: 0 },
  };

  const rows: Array<{
    label: string;
    count: number;
    total: number;
    status: WithdrawStatusFilter;
    color: string;
    bg: string;
  }> = [
    {
      label: "Pending",
      count: byStatus.pending.count,
      total: byStatus.pending.total,
      status: "pending",
      color: "text-warning-600 dark:text-warning-400",
      bg: "bg-warning-50 dark:bg-warning-500/10",
    },
    {
      label: "Approved",
      count: byStatus.approved.count,
      total: byStatus.approved.total,
      status: "approved",
      color: "text-success-600 dark:text-success-400",
      bg: "bg-success-50 dark:bg-success-500/10",
    },
    {
      label: "Rejected",
      count: byStatus.rejected.count,
      total: byStatus.rejected.total,
      status: "rejected",
      color: "text-error-600 dark:text-error-400",
      bg: "bg-error-50 dark:bg-error-500/10",
    },
  ];

  return (
    <div className="space-y-4">
      {showAttention && (
        <Link
          href={withdrawListHref("pending")}
          className="border-warning-200 bg-warning-50 hover:border-warning-300 dark:border-warning-800 dark:bg-warning-500/10 dark:hover:border-warning-700 flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 ease-out hover:shadow-sm"
        >
          <span className="text-warning-800 dark:text-warning-200 text-sm font-medium">
            {pendingCount} pending withdrawal{pendingCount !== 1 ? "s" : ""}{" "}
            need review
            {displaySummary?.withdrawByStatus?.pending?.oldestAt ? (
              <span className="text-warning-700/90 dark:text-warning-300/90 mt-0.5 block text-xs font-normal">
                Oldest pending:{" "}
                {formatDateTime(
                  displaySummary.withdrawByStatus.pending.oldestAt,
                  {
                    seconds: false,
                  },
                )}
              </span>
            ) : null}
          </span>
          <ArrowRightIcon className="text-warning-600 dark:text-warning-400 size-5 shrink-0" />
        </Link>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Withdrawals at a glance
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Count and total amount by status
            </p>
          </div>
          <Link
            href={withdrawListHref()}
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 ease-out"
          >
            View all
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {rows.map((row) => (
            <Link
              key={row.status}
              href={withdrawListHref(row.status)}
              aria-label={`View ${row.label.toLowerCase()} withdrawals`}
              className={`rounded-xl border border-gray-100 p-4 transition-all duration-200 ease-out hover:shadow-sm dark:border-gray-800 ${row.bg}`}
            >
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {row.label}
              </p>
              <p className="mt-1 font-bold text-gray-800 dark:text-white/90">
                {row.count} request{row.count !== 1 ? "s" : ""}
              </p>
              <p className={`mt-0.5 text-sm font-medium ${row.color}`}>
                {row.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {displaySummary?.currency ?? "THB"} total
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
