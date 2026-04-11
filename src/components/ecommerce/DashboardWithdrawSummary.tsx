"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon } from "@/icons";
import {
  MOCK_DASHBOARD_SUMMARY,
  fetchDashboardWithdrawSummary,
} from "@/lib/query/dashboardQueries";

export function DashboardWithdrawSummary() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", "withdraw-summary"],
    queryFn: fetchDashboardWithdrawSummary,
    staleTime: 60_000,
  });

  const displaySummary = summary ?? MOCK_DASHBOARD_SUMMARY;
  const pendingCount = displaySummary?.withdrawByStatus?.pending?.count ?? 0;
  const showAttention = pendingCount > 0;

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  const byStatus = displaySummary?.withdrawByStatus ?? {
    pending: { count: 0, total: 0 },
    approved: { count: 0, total: 0 },
    rejected: { count: 0, total: 0 },
  };

  const rows = [
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
          href="/withdraw"
          className="flex items-center justify-between rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 transition-all duration-200 ease-out hover:border-warning-300 hover:shadow-sm dark:border-warning-800 dark:bg-warning-500/10 dark:hover:border-warning-700"
        >
          <span className="text-sm font-medium text-warning-800 dark:text-warning-200">
            {pendingCount} pending withdrawal{pendingCount !== 1 ? "s" : ""} need review
            {displaySummary?.withdrawByStatus?.pending?.oldestAt ? (
              <span className="mt-0.5 block text-xs font-normal text-warning-700/90 dark:text-warning-300/90">
                Oldest pending:{" "}
                {new Date(displaySummary.withdrawByStatus.pending.oldestAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            ) : null}
          </span>
          <ArrowRightIcon className="size-5 shrink-0 text-warning-600 dark:text-warning-400" />
        </Link>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Withdrawals at a glance</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Count and total amount by status</p>
          </div>
          <Link
            href="/withdraw"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 transition-colors duration-200 ease-out hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            View all
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.status}
              className={`rounded-xl border border-gray-100 p-4 transition-all duration-200 ease-out hover:shadow-sm dark:border-gray-800 ${row.bg}`}
            >
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">{row.label}</p>
              <p className="mt-1 font-bold text-gray-800 dark:text-white/90">
                {row.count} request{row.count !== 1 ? "s" : ""}
              </p>
              <p className={`mt-0.5 text-sm font-medium ${row.color}`}>
                {row.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                total
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
