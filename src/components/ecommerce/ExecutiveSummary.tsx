"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GroupIcon, UserCircleIcon, BoxIconLine, DollarLineIcon } from "@/icons";
import {
  MOCK_DASHBOARD_STATS,
  MOCK_DASHBOARD_SUMMARY,
  fetchExecutiveDashboard,
} from "@/lib/query/dashboardQueries";

/** Show up to 2 decimal places only when the amount has a non-zero fractional part. */
function formatPayoutAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function ExecutiveSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "executive-summary"],
    queryFn: fetchExecutiveDashboard,
    staleTime: 60_000,
  });

  const displayStats = data?.stats ?? MOCK_DASHBOARD_STATS;
  const displaySummary = data?.summary ?? MOCK_DASHBOARD_SUMMARY;

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
      value: formatPayoutAmount(displaySummary.conversionTotalPayout),
      icon: <DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />,
      bgIcon: "bg-gray-100 dark:bg-gray-800",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          >
            <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="mt-5 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
      {cards.map((card) => {
        const content = (
          <>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 ease-out group-hover:scale-105 ${card.bgIcon}`}
            >
              {card.icon}
            </div>
            <div className="mt-5 min-w-0">
              <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
              <p className="mt-2 break-words font-bold text-gray-800 text-title-sm dark:text-white/90">{card.value}</p>
            </div>
          </>
        );
        const className =
          "group rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 ease-out hover:border-brand-200 hover:bg-gray-50 hover:shadow-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800 dark:hover:bg-white/[0.06] md:p-6";
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
