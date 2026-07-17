"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon } from "@/icons";
import {
  DASHBOARD_INSIGHTS_QUERY_KEY,
  fetchDashboardInsights,
} from "@/lib/query/dashboardQueries";
import type { DashboardAlert, DashboardInsightRangeValue } from "@/types/api";
import { insightRangeLabel } from "@/components/ecommerce/DashboardInsightRangeControl";
import { DashboardQuestAnalyticsSection } from "@/components/ecommerce/DashboardQuestAnalyticsSection";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type DashboardInsightDetailsProps = {
  range?: DashboardInsightRangeValue;
};

function severityStyles(s: DashboardAlert["severity"]): string {
  switch (s) {
    case "high":
      return "border-error-200 bg-error-50/90 dark:border-error-800 dark:bg-error-950/25";
    case "medium":
      return "border-warning-200 bg-warning-50/80 dark:border-warning-900/40 dark:bg-warning-950/20";
    default:
      return "border-gray-200 bg-gray-50/90 dark:border-gray-700 dark:bg-gray-800/40";
  }
}

export function DashboardInsightDetails({
  range = "30d",
}: DashboardInsightDetailsProps = {}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...DASHBOARD_INSIGHTS_QUERY_KEY, range],
    queryFn: () => fetchDashboardInsights(range),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <div className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />
        <div className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p
        role="alert"
        className="border-error-200 bg-error-50 text-error-800 dark:border-error-800 dark:bg-error-950/30 dark:text-error-200 rounded-xl border px-4 py-3 text-sm"
      >
        {getApiErrorMessage(
          error,
          "Could not load dashboard insights. Refresh the page or check your connection.",
        )}
      </p>
    );
  }

  const byStatusEntries = Object.entries(data.conversionsByStatus).sort(
    (a, b) => b[1] - a[1],
  );
  const wm = data.withdrawMetrics;

  return (
    <div className="w-full min-w-0 space-y-6">
      {data.alerts.length > 0 ? (
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Alerts &amp; anomalies
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {data.alerts.length} active
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {data.alerts.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className={`flex flex-col gap-1 rounded-xl border p-4 transition-colors hover:opacity-95 sm:flex-row sm:items-start sm:justify-between ${severityStyles(a.severity)}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      <span className="mr-2 text-[10px] tracking-wide text-gray-500 uppercase dark:text-gray-400">
                        {a.severity}
                      </span>
                      {a.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {a.body}
                    </p>
                  </div>
                  <ArrowRightIcon className="mt-2 size-5 shrink-0 text-gray-400 sm:mt-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Conversion economics
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Status mix for conversions in the selected window (
            {insightRangeLabel(range)}).
          </p>
          <dl className="mt-4 space-y-3">
            {byStatusEntries.map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <dt className="text-gray-600 capitalize dark:text-gray-400">
                  {status}
                </dt>
                <dd className="font-semibold text-gray-900 tabular-nums dark:text-white">
                  {count}
                </dd>
              </div>
            ))}
          </dl>
          <Link
            href="/conversion"
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400 mt-4 inline-flex items-center gap-1 text-sm font-medium"
          >
            Open conversions
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Cash &amp; liquidity
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Withdrawal queue health (all time).
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">
                Approval rate
              </dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {wm.approvalRatePct != null ? `${wm.approvalRatePct}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">
                Rejected share (of decided)
              </dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {wm.rejectedSharePct != null ? `${wm.rejectedSharePct}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">
                Pending over 48h
              </dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {wm.pendingOver48hCount}
              </dd>
            </div>
          </dl>
          <Link
            href="/withdraw"
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400 mt-4 inline-flex items-center gap-1 text-sm font-medium"
          >
            Open withdrawals
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>

      <section className="min-w-0" aria-label="Quest analytics">
        <h3 className="mb-4 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
          Quest analytics
        </h3>
        <DashboardQuestAnalyticsSection
          quests={data.quests}
          rangeLabel={insightRangeLabel(range)}
          availability={data.availability.quests}
        />
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Affiliate networks
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Conversion counts span currencies; GMV and payout are eligible THB
            only ({insightRangeLabel(range)}).
          </p>
          <div className="mt-4 max-w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs tracking-wide text-gray-500 uppercase dark:border-gray-700 dark:text-gray-400">
                  <th className="pr-3 pb-2 font-medium">Network</th>
                  <th className="pr-3 pb-2 font-medium">Conv.</th>
                  <th className="pr-3 pb-2 font-medium">GMV</th>
                  <th className="pb-2 font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {data.networkBreakdown.map((row) => (
                  <tr
                    key={row.networkId}
                    className="border-b border-gray-100 dark:border-gray-800/80"
                  >
                    <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">
                      {row.networkName}
                    </td>
                    <td className="py-2 pr-3 text-gray-700 tabular-nums dark:text-gray-300">
                      {row.conversions}
                    </td>
                    <td className="py-2 pr-3 text-gray-700 tabular-nums dark:text-gray-300">
                      {row.gmv.toLocaleString()} {row.currency}
                    </td>
                    <td className="py-2 text-gray-700 tabular-nums dark:text-gray-300">
                      {row.payout.toLocaleString()} {row.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link
            href="/brands?tab=commission"
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400 mt-4 inline-flex items-center gap-1 text-sm font-medium"
          >
            Commission management
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Commission &amp; cap hygiene
          </h3>
          {data.availability.commissionHealth.available ? (
            <>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Live brands catalog (non-disabled).
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600 dark:text-gray-400">
                    Missing admin max cap
                  </dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">
                    {data.commissionHealth.missingAdminCap}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600 dark:text-gray-400">
                    Missing partner max cap
                  </dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">
                    {data.commissionHealth.missingPartnerCap}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600 dark:text-gray-400">
                    Admin cap &gt; partner cap
                  </dt>
                  <dd className="text-error-600 dark:text-error-400 font-semibold">
                    {data.commissionHealth.adminOverPartner}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/[0.04]">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Commission analytics unavailable
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {data.availability.commissionHealth.reason}
              </p>
            </div>
          )}
          <Link
            href="/brands"
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400 mt-4 inline-flex items-center gap-1 text-sm font-medium"
          >
            Review brands
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Top merchants ({insightRangeLabel(range)})
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          By commercial conversion count across currencies; money columns are
          eligible THB only.
        </p>
        <div className="mt-4 max-w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs tracking-wide text-gray-500 uppercase dark:border-gray-700 dark:text-gray-400">
                <th className="pr-3 pb-2 font-medium">Offer</th>
                <th className="pr-3 pb-2 font-medium">Conv.</th>
                <th className="pr-3 pb-2 font-medium">GMV</th>
                <th className="pb-2 font-medium">Payout</th>
              </tr>
            </thead>
            <tbody>
              {data.topOffers.map((row) => (
                <tr
                  key={`${row.networkId}-${row.providerAccount}-${row.offerId}`}
                  className="border-b border-gray-100 dark:border-gray-800/80"
                >
                  <td className="max-w-[220px] truncate py-2 pr-3 font-medium text-gray-900 dark:text-white">
                    {row.offerName}
                  </td>
                  <td className="py-2 pr-3 text-gray-700 tabular-nums dark:text-gray-300">
                    {row.conversions}
                  </td>
                  <td className="py-2 pr-3 text-gray-700 tabular-nums dark:text-gray-300">
                    {row.gmv.toLocaleString()} {row.currency}
                  </td>
                  <td className="py-2 text-gray-700 tabular-nums dark:text-gray-300">
                    {row.payout.toLocaleString()} {row.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
