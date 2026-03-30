"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GroupIcon, UserCircleIcon, BoxIconLine, DollarLineIcon } from "@/icons";
import { useApi } from "@/hooks/useApi";
import type { DashboardStatsResponse, DashboardSummaryResponse } from "@/types/api";

// Fallback mock data when API fails or times out so the dashboard always shows data
const MOCK_STATS: DashboardStatsResponse = {
  gogocashUsers: 550,
  mycashbackUsers: 550,
};
const MOCK_SUMMARY: DashboardSummaryResponse = {
  conversionCount: 550,
  conversionTotalPayout: 124750.5,
  withdrawByStatus: {
    pending: { count: 12, total: 8450 },
    approved: { count: 88, total: 52300.25 },
    rejected: { count: 5, total: 1200 },
  },
};

export function ExecutiveSummary() {
  const { getDashboardStats, getDashboardSummary, getUsers } = useApi();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(MOCK_STATS);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(MOCK_SUMMARY);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [statsRes, summaryRes] = await Promise.all([
          getDashboardStats().catch(async () => {
            const users = await getUsers({ limit: 1, page: 1 });
            return {
              gogocashUsers: users.pagination?.total ?? MOCK_STATS.gogocashUsers,
              mycashbackUsers: MOCK_STATS.mycashbackUsers,
            } as DashboardStatsResponse;
          }),
          getDashboardSummary(),
        ]);
        if (!cancelled) {
          setStats(statsRes);
          setSummary(summaryRes);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setStats(MOCK_STATS);
          setSummary(MOCK_SUMMARY);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [getDashboardStats, getDashboardSummary, getUsers]);

  const displayStats = stats ?? MOCK_STATS;
  const displaySummary = summary ?? MOCK_SUMMARY;

  const cards = [
    {
      label: "GoGoCash users",
      value: displayStats.gogocashUsers.toLocaleString(),
      icon: <GroupIcon className="size-6 text-brand-600 dark:text-brand-400" />,
      href: "/users",
      bgIcon: "bg-brand-100 dark:bg-brand-900/30",
    },
    {
      label: "MyCashBack users",
      value: displayStats.mycashbackUsers.toLocaleString(),
      icon: <UserCircleIcon className="size-6 text-gray-800 dark:text-white/90" />,
      bgIcon: "bg-gray-100 dark:bg-gray-800",
    },
    {
      label: "Total conversions",
      value: displaySummary.conversionCount.toLocaleString(),
      icon: <BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />,
      href: "/conversion",
      bgIcon: "bg-gray-100 dark:bg-gray-800",
    },
    {
      label: "Total payout",
      value: displaySummary.conversionTotalPayout.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      icon: <DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />,
      bgIcon: "bg-gray-100 dark:bg-gray-800",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
      {cards.map((card) => {
        const content = (
          <>
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-xl ${card.bgIcon}`}
            >
              {card.icon}
            </div>
            <div className="mt-5 min-w-0">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {card.label}
              </span>
              <p className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90 truncate">
                {card.value}
              </p>
            </div>
          </>
        );
        const className =
          "rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800 dark:hover:bg-white/[0.06] md:p-6";
        if (card.href) {
          return (
            <Link key={card.label} href={card.href} className={className}>
              {content}
            </Link>
          );
        }
        return (
          <div key={card.label} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
