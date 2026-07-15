"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import NoData from "@/components/common/NoData";
import {
  getCouponInsights,
  type CouponInsightRedemption,
} from "@/lib/api/couponInsightsApi";
import { formatDateTime } from "@/lib/dateFormat";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type InsightTab = "redemptions" | "insight";

export default function CouponHistoryTable({ couponId }: { couponId: string }) {
  const [activeTab, setActiveTab] = useState<InsightTab>("redemptions");
  const [page, setPage] = useState(1);
  const limit = 25;
  const query = useQuery({
    enabled: Boolean(couponId),
    queryKey: ["coupon-insights", couponId, page, limit],
    queryFn: () => getCouponInsights(couponId, { limit, page }),
  });

  if (query.isLoading) {
    return <CouponInsightLoading />;
  }

  if (query.isError) {
    const message = getApiErrorMessage(
      query.error,
      "Couldn't load this coupon's insight. Please retry, or contact an administrator if it continues.",
    );
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/20">
        <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
        <button
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-gray-900 dark:text-red-300"
          onClick={() => query.refetch()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!query.data) return null;

  const { coupon, metrics, redemptions } = query.data;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-4 py-5 sm:px-6 dark:border-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {coupon.offerName || "Coupon"}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              {coupon.name}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {coupon.code ? `Code ${coupon.code}` : "No coupon code required"}
            </p>
          </div>
          <CouponInsightTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {activeTab === "redemptions" ? (
        <RedemptionPanel
          limit={redemptions.limit}
          onPageChange={setPage}
          page={redemptions.page}
          rows={redemptions.data}
          total={redemptions.total}
          totalPages={redemptions.totalPages}
        />
      ) : (
        <InsightPanel metrics={metrics} />
      )}
    </div>
  );
}

function CouponInsightTabs({
  activeTab,
  onChange,
}: {
  activeTab: InsightTab;
  onChange: (tab: InsightTab) => void;
}) {
  return (
    <div
      aria-label="Coupon insight sections"
      className="flex shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/80"
      role="tablist"
    >
      {(
        [
          ["redemptions", "Redemptions"],
          ["insight", "Insight"],
        ] as const
      ).map(([value, label]) => {
        const selected = activeTab === value;
        return (
          <button
            aria-controls={`coupon-insight-panel-${value}`}
            aria-selected={selected}
            className={`focus-visible:ring-brand-500 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:outline-none ${
              selected
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
            id={`coupon-insight-tab-${value}`}
            key={value}
            onClick={() => onChange(value)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RedemptionPanel({
  limit,
  onPageChange,
  page,
  rows,
  total,
  totalPages,
}: {
  limit: number;
  onPageChange: (page: number) => void;
  page: number;
  rows: CouponInsightRedemption[];
  total: number;
  totalPages: number;
}) {
  return (
    <div
      aria-labelledby="coupon-insight-tab-redemptions"
      className="p-4 sm:p-6 dark:bg-white/[0.02]"
      id="coupon-insight-panel-redemptions"
      role="tabpanel"
    >
      <p className="mb-5 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        Confirmed coupon usage reported by a trusted merchant or operations
        integration. Duplicate reference IDs are ignored.
      </p>
      {rows.length > 0 ? (
        <div className="min-w-0 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {["#", "Reference", "User", "Used at", "Status"].map(
                  (label) => (
                    <th
                      className="px-5 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
                      key={label}
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {rows.map((row, index) => (
                <RedemptionRow
                  index={(page - 1) * limit + index + 1}
                  key={row.id}
                  row={row}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <NoData title="No confirmed redemptions yet">
          Usage appears here after a trusted redemption integration reports it.
        </NoData>
      )}
      {totalPages > 1 ? (
        <AdminPaginationBar
          limit={limit}
          onPageChange={onPageChange}
          page={page}
          total={total}
          totalPages={totalPages}
        />
      ) : null}
    </div>
  );
}

function RedemptionRow({
  index,
  row,
}: {
  index: number;
  row: CouponInsightRedemption;
}) {
  const user = row.userEmail || row.userId || "Not supplied";
  return (
    <tr>
      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
        {index}
      </td>
      <td className="px-5 py-4 font-mono text-sm text-gray-800 dark:text-gray-200">
        {row.referenceId}
      </td>
      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
        {user}
      </td>
      <td className="px-5 py-4 text-sm whitespace-nowrap text-gray-600 dark:text-gray-400">
        {formatDateTime(row.usedAt, { fallback: row.usedAt })}
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 capitalize dark:bg-green-900/30 dark:text-green-200">
          {row.status}
        </span>
      </td>
    </tr>
  );
}

function InsightPanel({
  metrics,
}: {
  metrics: {
    codeCopies: number;
    copyRate: number;
    detailViews: number;
    usageAmount: number;
    usageUnit: "redemptions";
  };
}) {
  const cards = [
    {
      detail: "Coupon cards shown on a shop detail page",
      label: "Detail views",
      value: metrics.detailViews.toLocaleString(),
    },
    {
      detail: "Successful copy-to-clipboard actions",
      label: "Code copies",
      value: metrics.codeCopies.toLocaleString(),
    },
    {
      detail: "Code copies divided by detail views",
      label: "Copy rate",
      value: `${metrics.copyRate.toFixed(1)}%`,
    },
    {
      detail: "Confirmed usage, not an estimated sale value",
      label: "Usage amount",
      value: `${metrics.usageAmount.toLocaleString()} ${metrics.usageUnit}`,
    },
  ];

  return (
    <div
      aria-labelledby="coupon-insight-tab-insight"
      className="space-y-5 p-4 sm:p-6 dark:bg-white/[0.02]"
      id="coupon-insight-panel-insight"
      role="tabpanel"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-4 dark:border-gray-700 dark:bg-gray-900/50"
            key={card.label}
          >
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums dark:text-white">
              {card.value}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {card.detail}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        Views count one idempotent event per rendered coupon card. Copies count
        only successful clipboard actions. Usage amount is a count of confirmed
        redemptions; monetary value is not inferred because the coupon flow does
        not provide checkout value or currency.
      </p>
    </div>
  );
}

function CouponInsightLoading() {
  return (
    <div className="animate-pulse space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="h-6 w-52 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-80 max-w-full rounded bg-gray-100 dark:bg-gray-800" />
      <div className="h-56 rounded-xl bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}
