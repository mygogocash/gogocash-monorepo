"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BoxIconLine, DollarLineIcon, GroupIcon, TrophyIcon, UserCircleIcon } from "@/icons";
import {
  DASHBOARD_INSIGHTS_QUERY_KEY,
  fetchDashboardInsights,
} from "@/lib/query/dashboardQueries";
import type { DashboardInsightRange, DashboardInsightsResponse } from "@/types/api";
import { insightRangeLabel } from "@/components/ecommerce/DashboardInsightRangeControl";

function formatPayoutAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function DeltaText({
  current,
  prior,
  invert,
}: {
  current: number;
  prior: number | null | undefined;
  /** When true, decrease is "good" (e.g. pending count). */
  invert?: boolean;
}) {
  if (prior == null || prior === 0) return null;
  const pct = Math.round(((current - prior) / prior) * 1000) / 10;
  if (pct === 0) return null;
  const good = invert ? pct < 0 : pct > 0;
  return (
    <span
      className={`mt-1 block text-xs font-medium ${
        good ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"
      }`}
    >
      {pct > 0 ? "↑" : "↓"} {Math.abs(pct)}% vs prior period
    </span>
  );
}

type ExecutiveSummaryProps = {
  range?: DashboardInsightRange;
};

export function ExecutiveSummary({ range = "30d" }: ExecutiveSummaryProps = {}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...DASHBOARD_INSIGHTS_QUERY_KEY, range],
    queryFn: () => fetchDashboardInsights(range),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="min-w-0 animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          >
            <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="mt-5 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800 dark:border-error-800 dark:bg-error-950/30 dark:text-error-200">
        Could not load dashboard insights. Refresh the page or check your connection.
      </p>
    );
  }

  const insights: DashboardInsightsResponse = data;
  const k = insights.kpis.current;
  const p = insights.kpis.prior;
  const pending = insights.withdrawByStatus.pending;

  const cards: {
    label: string;
    sublabel?: string;
    value: string;
    icon: React.ReactNode;
    bgIcon: string;
    href?: string;
    delta?: { current: number; prior: number | null | undefined; invert?: boolean };
  }[] = [
    {
      label: "GoGoCash users",
      sublabel: `${insights.kpis.newUsersInPeriod} new in selected period`,
      value: k.gogocashUsers.toLocaleString(),
      icon: <GroupIcon className="size-6 text-brand-600 dark:text-brand-400" />,
      bgIcon: "bg-brand-100 dark:bg-brand-900/30",
      href: "/users",
    },
    {
      label: "MyCashBack users",
      value: k.mycashbackUsers.toLocaleString(),
      icon: <UserCircleIcon className="size-6 text-gray-800 dark:text-white/90" />,
      bgIcon: "bg-gray-100 dark:bg-gray-800",
      href: "/users/mycashback",
    },
    {
      label: `Conversions (${range})`,
      value: k.conversionCount.toLocaleString(),
      icon: <BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />,
      bgIcon: "bg-gray-100 dark:bg-gray-800",
      href: "/conversion",
      delta: { current: k.conversionCount, prior: p?.conversionCount },
    },
    {
      label: `GMV (${range})`,
      value: formatPayoutAmount(k.conversionTotalSaleAmount),
      icon: <DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />,
      bgIcon: "bg-gray-100 dark:bg-gray-800",
      href: "/conversion",
      delta: { current: k.conversionTotalSaleAmount, prior: p?.conversionTotalSaleAmount },
    },
    {
      label: `Cashback / payout (${range})`,
      value: formatPayoutAmount(k.conversionTotalPayout),
      icon: <DollarLineIcon className="size-6 text-success-600 dark:text-success-400" />,
      bgIcon: "bg-success-50 dark:bg-success-500/10",
      href: "/conversion",
      delta: { current: k.conversionTotalPayout, prior: p?.conversionTotalPayout },
    },
    {
      label: "Pending withdrawals",
      sublabel: `${pending.count} requests · ${formatPayoutAmount(pending.total)}`,
      value: String(pending.count),
      icon: <DollarLineIcon className="size-6 text-warning-600 dark:text-warning-400" />,
      bgIcon: "bg-warning-50 dark:bg-warning-500/10",
      href: "/withdraw?status=pending",
    },
    {
      label: "Quests live",
      sublabel: `${insights.quests.overlappingSelectedRange} in window · ${insights.quests.engagement.pointsIssuedInOverlapping.toLocaleString()} pts (mock)`,
      value: String(insights.quests.liveNow),
      icon: <TrophyIcon className="size-6 text-amber-600 dark:text-amber-400" />,
      bgIcon: "bg-amber-50 dark:bg-amber-500/10",
      href: "/quest",
    },
  ];

  return (
    <div className="min-w-0 w-full space-y-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          KPI window:{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">{insightRangeLabel(range)}</span>
          {insights.lastUpdated ? (
            <span className="ml-2">
              · Updated {new Date(insights.lastUpdated).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
            </span>
          ) : null}
        </p>
        {insights.payoutRatio != null ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Payout / GMV:{" "}
            <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">
              {(insights.payoutRatio * 100).toFixed(2)}%
            </span>
          </p>
        ) : null}
      </div>
      <p className="break-words text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {insights.insightSummary}
      </p>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
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
                <p className="mt-2 break-words font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {card.value}
                </p>
                {card.sublabel ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.sublabel}</p>
                ) : null}
                {card.delta ? (
                  <DeltaText
                    current={card.delta.current}
                    prior={card.delta.prior}
                    invert={card.delta.invert}
                  />
                ) : null}
              </div>
            </>
          );
          const className =
            "group min-w-0 rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 ease-out hover:border-brand-200 hover:bg-gray-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800 dark:hover:bg-white/[0.06] dark:focus-visible:ring-offset-gray-900 md:p-6";
          const ariaLabel = [card.label, card.value, card.sublabel].filter(Boolean).join(". ");
          if (card.href) {
            return (
              <Link key={card.label} href={card.href} className={className} aria-label={ariaLabel}>
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
    </div>
  );
}
