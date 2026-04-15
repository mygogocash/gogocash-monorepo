"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon } from "@/icons";
import {
  DASHBOARD_INSIGHTS_QUERY_KEY,
  fetchDashboardInsights,
} from "@/lib/query/dashboardQueries";
import type { DashboardAlert, DashboardInsightRange } from "@/types/api";
import { insightRangeLabel } from "@/components/ecommerce/DashboardInsightRangeControl";
import { DashboardQuestAnalyticsSection } from "@/components/ecommerce/DashboardQuestAnalyticsSection";

type DashboardInsightDetailsProps = {
  range?: DashboardInsightRange;
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

export function DashboardInsightDetails({ range = "30d" }: DashboardInsightDetailsProps = {}) {
  const { data, isLoading } = useQuery({
    queryKey: [...DASHBOARD_INSIGHTS_QUERY_KEY, range],
    queryFn: () => fetchDashboardInsights(range),
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="min-w-0 w-full space-y-4">
        <div className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />
        <div className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />
      </div>
    );
  }

  const byStatusEntries = Object.entries(data.conversionsByStatus).sort((a, b) => b[1] - a[1]);
  const wm = data.withdrawMetrics;

  return (
    <div className="min-w-0 w-full space-y-6">
      {data.alerts.length > 0 ? (
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Alerts &amp; anomalies</h3>
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
                      <span className="mr-2 uppercase text-[10px] tracking-wide text-gray-500 dark:text-gray-400">
                        {a.severity}
                      </span>
                      {a.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{a.body}</p>
                  </div>
                  <ArrowRightIcon className="mt-2 size-5 shrink-0 text-gray-400 sm:mt-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Conversion economics</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Status mix for conversions in the selected window ({insightRangeLabel(range)}).
          </p>
          <dl className="mt-4 space-y-3">
            {byStatusEntries.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between gap-4 text-sm">
                <dt className="capitalize text-gray-600 dark:text-gray-400">{status}</dt>
                <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">{count}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/conversion"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Open conversions
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Cash &amp; liquidity</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Withdrawal queue health (all time).</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Approval rate</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {wm.approvalRatePct != null ? `${wm.approvalRatePct}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Rejected share (of decided)</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {wm.rejectedSharePct != null ? `${wm.rejectedSharePct}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Pending over 48h</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{wm.pendingOver48hCount}</dd>
            </div>
          </dl>
          <Link
            href="/withdraw"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Open withdrawals
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>

      <section className="min-w-0" aria-label="Quest analytics">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Quest analytics
        </h3>
        <DashboardQuestAnalyticsSection quests={data.quests} rangeLabel={insightRangeLabel(range)} />
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Affiliate networks</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Conversions and GMV by network ({insightRangeLabel(range)}).
          </p>
          <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-2 pr-3 font-medium">Network</th>
                  <th className="pb-2 pr-3 font-medium">Conv.</th>
                  <th className="pb-2 pr-3 font-medium">GMV</th>
                  <th className="pb-2 font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {data.networkBreakdown.map((row) => (
                  <tr
                    key={row.networkId}
                    className="border-b border-gray-100 dark:border-gray-800/80"
                  >
                    <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{row.networkName}</td>
                    <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">
                      {row.conversions}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">
                      {row.gmv.toLocaleString()}
                    </td>
                    <td className="py-2 tabular-nums text-gray-700 dark:text-gray-300">
                      {row.payout.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link
            href="/brands?tab=commission"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Commission management
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Commission &amp; cap hygiene</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Live brands catalog (non-disabled).</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Missing admin max cap</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {data.commissionHealth.missingAdminCap}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Missing partner max cap</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {data.commissionHealth.missingPartnerCap}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Admin cap &gt; partner cap</dt>
              <dd className="font-semibold text-error-600 dark:text-error-400">
                {data.commissionHealth.adminOverPartner}
              </dd>
            </div>
          </dl>
          <Link
            href="/brands"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Review brands
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Top merchants ({insightRangeLabel(range)})
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">By conversion count in the selected window.</p>
        <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-2 pr-3 font-medium">Offer</th>
                <th className="pb-2 pr-3 font-medium">Conv.</th>
                <th className="pb-2 pr-3 font-medium">GMV</th>
                <th className="pb-2 font-medium">Payout</th>
              </tr>
            </thead>
            <tbody>
              {data.topOffers.map((row) => (
                <tr key={`${row.offerId}-${row.merchantId}`} className="border-b border-gray-100 dark:border-gray-800/80">
                  <td className="max-w-[220px] truncate py-2 pr-3 font-medium text-gray-900 dark:text-white">
                    {row.offerName}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">{row.conversions}</td>
                  <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">
                    {row.gmv.toLocaleString()} {row.currency}
                  </td>
                  <td className="py-2 tabular-nums text-gray-700 dark:text-gray-300">
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
