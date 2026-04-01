"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GroupIcon, UserCircleIcon } from "@/icons";
import { fetchDashboardUserStats } from "@/lib/query/dashboardQueries";

export function DashboardUserStats() {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboard", "user-stats"],
    queryFn: fetchDashboardUserStats,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 animate-pulse">
          <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="mt-5 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 animate-pulse">
          <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="mt-5 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <Link
        href="/users"
        className="rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800 dark:hover:bg-white/[0.06] md:p-6"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30">
          <GroupIcon className="size-6 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">GoGoCash users</span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {isError ? "—" : stats?.gogocashUsers?.toLocaleString() ?? "0"}
          </h4>
        </div>
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <UserCircleIcon className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">MyCashBack users</span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {isError ? "—" : stats?.mycashbackUsers?.toLocaleString() ?? "0"}
          </h4>
        </div>
      </div>
    </div>
  );
}
