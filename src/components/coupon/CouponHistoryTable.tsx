"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/dateFormat";
import Button from "@/components/ui/button/Button";

export interface CouponHistoryEntry {
  id: string;
  couponCode: string;
  couponName: string;
  userId: string;
  userEmail: string;
  usedAt: string;
  offerName: string;
  discount?: string;
  status: "redeemed" | "expired" | "cancelled";
}

// Mock data for coupon usage history
const MOCK_HISTORY: CouponHistoryEntry[] = [
  {
    id: "1",
    couponCode: "BANANA10",
    couponName: "Banana IT 10% Off",
    userId: "u1",
    userEmail: "user1@example.com",
    usedAt: "2026-03-15T10:30:00Z",
    offerName: "Banana IT TH - CPS",
    discount: "10%",
    status: "redeemed",
  },
  {
    id: "2",
    couponCode: "ADIDAS50",
    couponName: "Adidas 50 THB",
    userId: "u2",
    userEmail: "user2@example.com",
    usedAt: "2026-03-14T14:20:00Z",
    offerName: "Adidas TH - CPS",
    discount: "50 THB",
    status: "redeemed",
  },
  {
    id: "3",
    couponCode: "BANANA10",
    couponName: "Banana IT 10% Off",
    userId: "u3",
    userEmail: "user3@example.com",
    usedAt: "2026-03-13T09:15:00Z",
    offerName: "Banana IT TH - CPS",
    discount: "10%",
    status: "redeemed",
  },
  {
    id: "4",
    couponCode: "AIRASIA5",
    couponName: "AirAsia Welcome 5%",
    userId: "u4",
    userEmail: "user4@example.com",
    usedAt: "2026-03-12T16:45:00Z",
    offerName: "AirAsia Travel - CPS",
    discount: "5%",
    status: "redeemed",
  },
  {
    id: "5",
    couponCode: "EXPIRED20",
    couponName: "Expired Promo",
    userId: "u5",
    userEmail: "user5@example.com",
    usedAt: "2026-03-10T11:00:00Z",
    offerName: "Banana IT TH - CPS",
    discount: "20%",
    status: "expired",
  },
  {
    id: "6",
    couponCode: "ADIDAS50",
    couponName: "Adidas 50 THB",
    userId: "u1",
    userEmail: "user1@example.com",
    usedAt: "2026-03-11T08:30:00Z",
    offerName: "Adidas TH - CPS",
    discount: "50 THB",
    status: "redeemed",
  },
  {
    id: "7",
    couponCode: "BANANA10",
    couponName: "Banana IT 10% Off",
    userId: "u6",
    userEmail: "user6@example.com",
    usedAt: "2026-03-09T13:20:00Z",
    offerName: "Banana IT TH - CPS",
    discount: "10%",
    status: "cancelled",
  },
  {
    id: "8",
    couponCode: "AIRASIA5",
    couponName: "AirAsia Welcome 5%",
    userId: "u2",
    userEmail: "user2@example.com",
    usedAt: "2026-03-08T17:00:00Z",
    offerName: "AirAsia Travel - CPS",
    discount: "5%",
    status: "redeemed",
  },
];

const PAGE_SIZE = 10;

type HistoryTab = "redemptions" | "engagement";

export interface CouponEngagementRow {
  couponCode: string;
  couponName: string;
  offerName: string;
  /** Users who opened the coupon detail screen */
  detailViews: number;
  /** Users who copied the coupon code (clipboard) */
  copies: number;
}

type CouponHistoryQuickView =
  | { kind: "redemption"; entry: CouponHistoryEntry }
  | { kind: "engagement"; row: CouponEngagementRow };

/** Mock engagement — replace with API when analytics are available */
const MOCK_ENGAGEMENT: CouponEngagementRow[] = [
  {
    couponCode: "BANANA10",
    couponName: "Banana IT 10% Off",
    offerName: "Banana IT TH - CPS",
    detailViews: 1842,
    copies: 526,
  },
  {
    couponCode: "ADIDAS50",
    couponName: "Adidas 50 THB",
    offerName: "Adidas TH - CPS",
    detailViews: 903,
    copies: 241,
  },
  {
    couponCode: "AIRASIA5",
    couponName: "AirAsia Welcome 5%",
    offerName: "AirAsia Travel - CPS",
    detailViews: 612,
    copies: 198,
  },
  {
    couponCode: "EXPIRED20",
    couponName: "Expired Promo",
    offerName: "Banana IT TH - CPS",
    detailViews: 310,
    copies: 44,
  },
];

const STATUS_OPTIONS: {
  value: "" | CouponHistoryEntry["status"];
  label: string;
}[] = [
  { value: "", label: "All" },
  { value: "redeemed", label: "Redeemed" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export default function CouponHistoryTable() {
  const [activeTab, setActiveTab] = useState<HistoryTab>("redemptions");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "" | CouponHistoryEntry["status"]
  >("");
  const [engagementSearch, setEngagementSearch] = useState("");
  const [engagementPage, setEngagementPage] = useState(1);
  const [quickView, setQuickView] = useState<CouponHistoryQuickView | null>(
    null,
  );

  const statusCounts = useMemo(() => {
    const tallies: Record<CouponHistoryEntry["status"], number> = {
      redeemed: 0,
      expired: 0,
      cancelled: 0,
    };
    for (const e of MOCK_HISTORY) {
      tallies[e.status]++;
    }
    return tallies;
  }, []);

  const filtered = useMemo(() => {
    let list = MOCK_HISTORY;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.couponCode.toLowerCase().includes(q) ||
          e.couponName.toLowerCase().includes(q) ||
          e.userEmail.toLowerCase().includes(q) ||
          e.offerName.toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      list = list.filter((e) => e.status === statusFilter);
    }
    return list;
  }, [search, statusFilter]);

  const totalDataset = MOCK_HISTORY.length;
  const hasActiveFilters = Boolean(search.trim() || statusFilter);

  const engagementFiltered = useMemo(() => {
    const q = engagementSearch.trim().toLowerCase();
    if (!q) return MOCK_ENGAGEMENT;
    return MOCK_ENGAGEMENT.filter(
      (row) =>
        row.couponCode.toLowerCase().includes(q) ||
        row.couponName.toLowerCase().includes(q) ||
        row.offerName.toLowerCase().includes(q),
    );
  }, [engagementSearch]);

  const engagementTotals = useMemo(() => {
    return engagementFiltered.reduce(
      (acc, row) => {
        acc.views += row.detailViews;
        acc.copies += row.copies;
        return acc;
      },
      { views: 0, copies: 0 },
    );
  }, [engagementFiltered]);

  const engagementPages = Math.max(
    1,
    Math.ceil(engagementFiltered.length / PAGE_SIZE),
  );
  const engagementPaginated = useMemo(
    () =>
      engagementFiltered.slice(
        (engagementPage - 1) * PAGE_SIZE,
        engagementPage * PAGE_SIZE,
      ),
    [engagementFiltered, engagementPage],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const formatDate = (iso: string) => formatDateTime(iso, { fallback: iso });

  const statusClass = (status: string) => {
    switch (status) {
      case "redeemed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
      case "expired":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const setStatus = (value: "" | CouponHistoryEntry["status"]) => {
    setStatusFilter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  const copyRatePercent = (views: number, copies: number) => {
    if (views <= 0) return "—";
    return `${((copies / views) * 100).toFixed(1)}%`;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Coupon history
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {activeTab === "redemptions"
                ? "Redemptions, expiry, and cancellations. Filter by status or search by code, coupon name, user email, or offer."
                : "How often users open a coupon’s detail screen and how often they copy the code. Figures below are sample data until analytics API is connected."}
            </p>
          </div>
          <div
            className="flex shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/80"
            role="tablist"
            aria-label="Coupon history sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "redemptions"}
              id="coupon-history-tab-redemptions"
              aria-controls="coupon-history-panel-redemptions"
              onClick={() => setActiveTab("redemptions")}
              className={`focus-visible:ring-brand-500 dark:focus-visible:ring-brand-400 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-gray-900 ${
                activeTab === "redemptions"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Redemptions
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "engagement"}
              id="coupon-history-tab-engagement"
              aria-controls="coupon-history-panel-engagement"
              onClick={() => setActiveTab("engagement")}
              className={`focus-visible:ring-brand-500 dark:focus-visible:ring-brand-400 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-gray-900 ${
                activeTab === "engagement"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Views &amp; copies
            </button>
          </div>
        </div>
      </div>

      {activeTab === "redemptions" ? (
        <>
          <div className="space-y-5 border-b border-gray-100 px-4 py-5 sm:px-6 dark:border-gray-800">
            <div>
              <p
                id="coupon-history-status-label"
                className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400"
              >
                Status
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-labelledby="coupon-history-status-label"
              >
                {STATUS_OPTIONS.map((opt) => {
                  const selected = statusFilter === opt.value;
                  const count =
                    opt.value === ""
                      ? totalDataset
                      : statusCounts[opt.value as CouponHistoryEntry["status"]];
                  return (
                    <button
                      key={opt.value || "all"}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setStatus(opt.value)}
                      className={`focus-visible:ring-brand-500 dark:focus-visible:ring-brand-400 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-gray-900 ${
                        selected
                          ? "border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-950/50 dark:text-brand-100"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-800"
                      }`}
                    >
                      {opt.label}
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
                          selected
                            ? "text-brand-900 dark:text-brand-50 bg-white/80 dark:bg-black/20"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="coupon-history-search"
                className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400"
              >
                Search
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-xl min-w-0 flex-1">
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500"
                    aria-hidden
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </span>
                  <input
                    id="coupon-history-search"
                    type="search"
                    autoComplete="off"
                    placeholder="Code, coupon name, email, or offer…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="focus:border-brand-500 focus:ring-brand-500/20 dark:focus:border-brand-400 dark:focus:ring-brand-400/25 h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pr-4 pl-11 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-gray-900"
                  />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/80"
                    title="Rows matching your filters"
                  >
                    <span className="text-2xl font-semibold text-gray-900 tabular-nums dark:text-white">
                      {filtered.length}
                    </span>
                    <span className="text-left text-xs leading-tight text-gray-500 dark:text-gray-400">
                      {hasActiveFilters ? (
                        <>
                          match
                          <br />
                          <span className="text-[0.65rem]">
                            of {totalDataset}
                          </span>
                        </>
                      ) : (
                        <>
                          total
                          <br />
                          <span className="text-[0.65rem]">records</span>
                        </>
                      )}
                    </span>
                  </div>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div
            id="coupon-history-panel-redemptions"
            role="tabpanel"
            aria-labelledby="coupon-history-tab-redemptions"
            className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]"
          >
            <div className="min-w-0 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Coupon Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Coupon Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Used At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Offer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {paginated.map((entry, index) => (
                    <tr
                      key={entry.id}
                      title="Click row for quick view"
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() =>
                        setQuickView({ kind: "redemption", entry })
                      }
                    >
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm whitespace-nowrap text-gray-800 dark:text-gray-200">
                        {entry.couponCode}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {entry.couponName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <div>{entry.userId}</div>
                        <div
                          className="max-w-[160px] truncate text-xs text-gray-500 dark:text-gray-400"
                          title={entry.userEmail}
                        >
                          {entry.userEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap text-gray-600 dark:text-gray-400">
                        {formatDate(entry.usedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {entry.offerName}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {entry.discount ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(entry.status)}`}
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                No coupon history found. Try adjusting search or filters.
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-5 border-b border-gray-100 px-4 py-5 sm:px-6 dark:border-gray-800">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Detail views (filtered)
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums dark:text-white">
                  {engagementTotals.views.toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Opens of coupon detail
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Code copies (filtered)
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums dark:text-white">
                  {engagementTotals.copies.toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Copy-to-clipboard taps
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Copy rate (filtered)
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums dark:text-white">
                  {copyRatePercent(
                    engagementTotals.views,
                    engagementTotals.copies,
                  )}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Copies ÷ detail views
                </p>
              </div>
            </div>
            <div>
              <label
                htmlFor="coupon-engagement-search"
                className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400"
              >
                Search coupons
              </label>
              <div className="relative max-w-xl">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500"
                  aria-hidden
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  id="coupon-engagement-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Filter by code, name, or offer…"
                  value={engagementSearch}
                  onChange={(e) => {
                    setEngagementSearch(e.target.value);
                    setEngagementPage(1);
                  }}
                  className="focus:border-brand-500 focus:ring-brand-500/20 dark:focus:border-brand-400 dark:focus:ring-brand-400/25 h-12 w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pr-4 pl-11 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-gray-900"
                />
              </div>
            </div>
          </div>

          <div
            id="coupon-history-panel-engagement"
            role="tabpanel"
            aria-labelledby="coupon-history-tab-engagement"
            className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]"
          >
            <div className="min-w-0 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Coupon code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Coupon name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Offer
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Detail views
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Copies
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Copy rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {engagementPaginated.map((row) => (
                    <tr
                      key={row.couponCode}
                      title="Click row for quick view"
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => setQuickView({ kind: "engagement", row })}
                    >
                      <td className="px-6 py-4 font-mono text-sm whitespace-nowrap text-gray-800 dark:text-gray-200">
                        {row.couponCode}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {row.couponName}
                      </td>
                      <td
                        className="max-w-[200px] truncate px-6 py-4 text-sm text-gray-600 dark:text-gray-400"
                        title={row.offerName}
                      >
                        {row.offerName}
                      </td>
                      <td className="px-6 py-4 text-right text-sm whitespace-nowrap text-gray-900 tabular-nums dark:text-gray-100">
                        {row.detailViews.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm whitespace-nowrap text-gray-900 tabular-nums dark:text-gray-100">
                        {row.copies.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm whitespace-nowrap text-gray-600 tabular-nums dark:text-gray-400">
                        {copyRatePercent(row.detailViews, row.copies)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {engagementFiltered.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                No coupons match your search.
              </div>
            )}

            {engagementPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(engagementPage - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(
                    engagementPage * PAGE_SIZE,
                    engagementFiltered.length,
                  )}{" "}
                  of {engagementFiltered.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEngagementPage((p) => Math.max(1, p - 1))}
                    disabled={engagementPage <= 1}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    Page {engagementPage} of {engagementPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEngagementPage((p) => Math.min(engagementPages, p + 1))
                    }
                    disabled={engagementPage >= engagementPages}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={quickView != null}
        onClose={() => setQuickView(null)}
        className="max-h-[90vh] overflow-y-auto"
      >
        {quickView?.kind === "redemption" ? (
          <div className="p-2 sm:p-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Redemption
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Read-only row detail.
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Coupon code
                </dt>
                <dd className="mt-0.5 font-mono text-gray-900 dark:text-gray-100">
                  {quickView.entry.couponCode}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Coupon name
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {quickView.entry.couponName}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  User
                </dt>
                <dd className="mt-0.5 break-all text-gray-900 dark:text-gray-100">
                  {quickView.entry.userId}
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                    {quickView.entry.userEmail}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Used at
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {formatDate(quickView.entry.usedAt)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Offer
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {quickView.entry.offerName}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Discount
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {quickView.entry.discount ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Status
                </dt>
                <dd className="mt-0.5 text-gray-900 capitalize dark:text-gray-100">
                  {quickView.entry.status}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setQuickView(null)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : quickView?.kind === "engagement" ? (
          <div className="p-2 sm:p-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Coupon engagement
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sample metrics for this coupon.
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Coupon code
                </dt>
                <dd className="mt-0.5 font-mono text-gray-900 dark:text-gray-100">
                  {quickView.row.couponCode}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Coupon name
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {quickView.row.couponName}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Offer
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {quickView.row.offerName}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Detail views
                </dt>
                <dd className="mt-0.5 text-gray-900 tabular-nums dark:text-gray-100">
                  {quickView.row.detailViews.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Copies
                </dt>
                <dd className="mt-0.5 text-gray-900 tabular-nums dark:text-gray-100">
                  {quickView.row.copies.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  Copy rate
                </dt>
                <dd className="mt-0.5 text-gray-900 tabular-nums dark:text-gray-100">
                  {copyRatePercent(
                    quickView.row.detailViews,
                    quickView.row.copies,
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setQuickView(null)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
