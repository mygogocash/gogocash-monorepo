"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import NoData from "@/components/common/NoData";
import DatePicker from "@/components/form/date-picker";
import { usePermissions } from "@/hooks/usePermissions";
import {
  ADMIN_DATETIME_ALT_FORMAT,
  ADMIN_DATETIME_VALUE_FORMAT,
} from "@/lib/adminDateTimeFormat";
import {
  getCouponInsights,
  recordCouponRedemption,
  type CouponInsightRedemption,
} from "@/lib/api/couponInsightsApi";
import { formatDateTime } from "@/lib/dateFormat";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { isAdminApiConfigured } from "@/lib/adminApiMode";

type InsightTab = "redemptions" | "insight";
const API_REDEMPTION_WRITE_ROLES = new Set([
  "support",
  "approver",
  "superadmin",
]);

function localDateTimeInputValue(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function CouponHistoryTable({ couponId }: { couponId: string }) {
  const permissions = usePermissions();
  const canRecordRedemption =
    isAdminApiConfigured(process.env.NEXT_PUBLIC_API_URL) &&
    permissions.ready &&
    (permissions.can("coupon:manage") ||
      API_REDEMPTION_WRITE_ROLES.has(permissions.apiRole ?? ""));
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
          canRecordRedemption={canRecordRedemption}
          couponId={couponId}
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
  canRecordRedemption,
  couponId,
  limit,
  onPageChange,
  page,
  rows,
  total,
  totalPages,
}: {
  canRecordRedemption: boolean;
  couponId: string;
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
      {canRecordRedemption ? (
        <RecordRedemptionForm
          couponId={couponId}
          onRecorded={() => onPageChange(1)}
        />
      ) : null}
      {rows.length > 0 ? (
        <div className="min-w-0 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {["#", "Reference", "Used at", "Status"].map((label) => (
                  <th
                    className="px-5 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
                    key={label}
                  >
                    {label}
                  </th>
                ))}
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

function RecordRedemptionForm({
  couponId,
  onRecorded,
}: {
  couponId: string;
  onRecorded: () => void;
}) {
  const queryClient = useQueryClient();
  const [referenceId, setReferenceId] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => localDateTimeInputValue());
  const [successMessage, setSuccessMessage] = useState("");
  const normalizedReferenceId = referenceId.trim();
  const referenceIsValid =
    normalizedReferenceId.length >= 3 &&
    normalizedReferenceId.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(normalizedReferenceId);
  const mutation = useMutation({
    mutationFn: () =>
      recordCouponRedemption(couponId, {
        occurredAt: new Date(occurredAt).toISOString(),
        referenceId: normalizedReferenceId,
      }),
    onMutate: () => {
      setSuccessMessage("");
    },
    onSuccess: async ({ recorded }) => {
      setReferenceId("");
      setOccurredAt(localDateTimeInputValue());
      setSuccessMessage(
        recorded
          ? "Confirmed redemption recorded."
          : "This redemption was already recorded; no duplicate was added.",
      );
      onRecorded();
      await queryClient.invalidateQueries({
        queryKey: ["coupon-insights", couponId],
      });
    },
  });
  const errorMessage = mutation.isError
    ? getApiErrorMessage(
        mutation.error,
        "Couldn't record this redemption. Check the details and try again.",
      )
    : "";

  return (
    <details className="mb-6 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/50">
      <summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-white">
        Record confirmed redemption
      </summary>
      <form
        className="mt-4 grid gap-4 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (referenceIsValid && occurredAt && !mutation.isPending) {
            mutation.mutate();
          }
        }}
      >
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Reference ID
          <input
            autoComplete="off"
            className="focus:border-brand-500 focus:ring-brand-500/20 mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            maxLength={128}
            onBlur={() => setReferenceId(normalizedReferenceId)}
            onChange={(event) => setReferenceId(event.target.value)}
            placeholder="merchant-order-123"
            required
            value={referenceId}
          />
        </label>
        <div className="lg:col-span-2">
          <DatePicker
            altFormat={ADMIN_DATETIME_ALT_FORMAT}
            altInput
            ariaLabel="Redemption time"
            dateFormat={ADMIN_DATETIME_VALUE_FORMAT}
            enableTime
            id={`coupon-redemption-time-${couponId}`}
            label="Redemption time"
            minuteIncrement={1}
            onValueChange={setOccurredAt}
            required
            value={occurredAt}
          />
        </div>
        <div className="lg:col-span-3">
          <button
            className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!referenceIsValid || !occurredAt || mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? "Recording…" : "Record redemption"}
          </button>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Use the merchant order or operations reference. Reusing it will not
            increase usage twice.
          </p>
          {successMessage ? (
            <p
              aria-live="polite"
              className="mt-2 text-sm text-green-700 dark:text-green-300"
            >
              {successMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p
              aria-live="assertive"
              className="mt-2 text-sm text-red-700 dark:text-red-300"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      </form>
    </details>
  );
}

function RedemptionRow({
  index,
  row,
}: {
  index: number;
  row: CouponInsightRedemption;
}) {
  return (
    <tr>
      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
        {index}
      </td>
      <td className="px-5 py-4 font-mono text-sm text-gray-800 dark:text-gray-200">
        {row.referenceId}
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
