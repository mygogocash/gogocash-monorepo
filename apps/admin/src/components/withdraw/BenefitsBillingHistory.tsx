"use client";

import { useState } from "react";
import NoData from "@/components/common/NoData";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import { formatDate } from "@/lib/dateFormat";
import { formatMoney } from "@/lib/currencyFormat";
import {
  sortBilling,
  filterBilling,
  type BillingSortKey,
  type BillingFilterField,
} from "@/lib/billingSort";

export type BillingRow = {
  date: string;
  amount: number;
  benefit: string;
  method: string;
  status: string;
  benefitBadge: string;
};

// Fixed catalogs for the value-filter dropdown (full domain).
const BILLING_METHOD_FILTERS: { value: string; label: string }[] = [
  { value: "Credit card", label: "Credit card" },
  { value: "Cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "promptpay", label: "PromptPay" },
  { value: "wallet", label: "Wallet" },
];
const BILLING_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "scheduled", label: "Scheduled" },
  { value: "failed", label: "Failed" },
];

/**
 * Combined membership + subscription billing-history table with a "Sort by"
 * dropdown and, for categorical sorts, a value filter. Shown on the
 * withdraw-detail "Benefits" tab. `benefitOptions` is the active-plan catalog
 * supplied by the parent.
 */
export default function BenefitsBillingHistory({
  rows,
  benefitOptions,
}: {
  rows: BillingRow[];
  benefitOptions: { value: string; label: string }[];
}) {
  const [billingSort, setBillingSort] = useState<BillingSortKey>("date-desc");
  const [billingFilter, setBillingFilter] = useState("");

  // When sorting by a categorical field, allow filtering rows to a single value.
  const billingFilterField: BillingFilterField | null =
    billingSort === "benefit" ||
    billingSort === "method" ||
    billingSort === "status"
      ? billingSort
      : null;
  const visibleBilling = sortBilling(
    billingFilterField
      ? filterBilling(rows, billingFilterField, billingFilter)
      : rows,
    billingSort,
  );
  const billingFilterCatalog =
    billingFilterField === "benefit"
      ? { noun: "benefits", options: benefitOptions }
      : billingFilterField === "method"
        ? { noun: "methods", options: BILLING_METHOD_FILTERS }
        : billingFilterField === "status"
          ? { noun: "statuses", options: BILLING_STATUS_FILTERS }
          : null;

  return (
    <div className="mt-8">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
          Billing history
        </h4>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            Sort by
            <SortByDropdown
              value={billingSort}
              onChange={(e) => {
                setBillingSort(e.target.value as BillingSortKey);
                setBillingFilter("");
              }}
            >
              <option value="date-desc">Date (newest)</option>
              <option value="date-asc">Date (oldest)</option>
              <option value="amount-desc">Amount (high–low)</option>
              <option value="amount-asc">Amount (low–high)</option>
              <option value="benefit">Benefit</option>
              <option value="method">Payment method</option>
              <option value="status">Status</option>
            </SortByDropdown>
          </label>
          {billingFilterCatalog && (
            <select
              value={billingFilter}
              onChange={(e) => setBillingFilter(e.target.value)}
              aria-label="Filter billing rows"
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="">All {billingFilterCatalog.noun}</option>
              {billingFilterCatalog.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {visibleBilling.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Benefits
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Amount
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Payment method
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {visibleBilling.map((b, i) => (
                <tr key={i} className="text-gray-800 dark:text-gray-200">
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatDate(b.date)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${b.benefitBadge}`}
                    >
                      {b.benefit}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono tabular-nums">
                    {formatMoney(b.amount)}
                  </td>
                  <td className="px-3 py-3 capitalize">{b.method}</td>
                  <td className="px-3 py-3 capitalize">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <NoData>
          {rows.length === 0
            ? "No billing history."
            : "No rows match this filter."}
        </NoData>
      )}
    </div>
  );
}
