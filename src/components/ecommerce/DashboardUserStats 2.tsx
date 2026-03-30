"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GroupIcon, UserCircleIcon } from "@/icons";
import { useApi } from "@/hooks/useApi";
import type { DashboardStatsResponse } from "@/types/api";

export function DashboardUserStats() {
  const { getDashboardStats, getUsers } = useApi();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        try {
          const data = await getDashboardStats();
          if (!cancelled) setStats(data);
        } catch {
          // Fallback: if dashboard/stats not available, use users list total for GoGoCash
          const res = await getUsers({ limit: 1, page: 1 });
          if (!cancelled) {
            setStats({
              gogocashUsers: res.pagination?.total ?? 0,
              mycashbackUsers: 0,
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stats");
          setStats({ gogocashUsers: 0, mycashbackUsers: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  if (loading) {
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
      {/* GoGoCash users */}
      <Link
        href="/users"
        className="rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800 dark:hover:bg-white/[0.06] md:p-6"
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30">
          <GroupIcon className="size-6 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            GoGoCash users
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {error ? "—" : stats?.gogocashUsers?.toLocaleString() ?? "0"}
          </h4>
        </div>
      </Link>

      {/* MyCashBack users */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800">
          <UserCircleIcon className="size-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="mt-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            MyCashBack users
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {error ? "—" : stats?.mycashbackUsers?.toLocaleString() ?? "0"}
          </h4>
        </div>
      </div>
    </div>
  );
}
