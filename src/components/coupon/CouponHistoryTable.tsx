"use client";

import React, { useState, useMemo } from "react";

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
  { id: "1", couponCode: "SHOPEE10", couponName: "Shopee 10% Off", userId: "u1", userEmail: "user1@example.com", usedAt: "2026-03-15T10:30:00Z", offerName: "Shopee TH - CPS", discount: "10%", status: "redeemed" },
  { id: "2", couponCode: "LAZADA50", couponName: "Lazada 50 THB", userId: "u2", userEmail: "user2@example.com", usedAt: "2026-03-14T14:20:00Z", offerName: "Lazada Thailand", discount: "50 THB", status: "redeemed" },
  { id: "3", couponCode: "SHOPEE10", couponName: "Shopee 10% Off", userId: "u3", userEmail: "user3@example.com", usedAt: "2026-03-13T09:15:00Z", offerName: "Shopee TH - CPS", discount: "10%", status: "redeemed" },
  { id: "4", couponCode: "WELCOME5", couponName: "Welcome 5%", userId: "u4", userEmail: "user4@example.com", usedAt: "2026-03-12T16:45:00Z", offerName: "Agoda Hotels", discount: "5%", status: "redeemed" },
  { id: "5", couponCode: "EXPIRED20", couponName: "Expired Promo", userId: "u5", userEmail: "user5@example.com", usedAt: "2026-03-10T11:00:00Z", offerName: "Shopee TH - CPS", discount: "20%", status: "expired" },
  { id: "6", couponCode: "LAZADA50", couponName: "Lazada 50 THB", userId: "u1", userEmail: "user1@example.com", usedAt: "2026-03-11T08:30:00Z", offerName: "Lazada Thailand", discount: "50 THB", status: "redeemed" },
  { id: "7", couponCode: "SHOPEE10", couponName: "Shopee 10% Off", userId: "u6", userEmail: "user6@example.com", usedAt: "2026-03-09T13:20:00Z", offerName: "Shopee TH - CPS", discount: "10%", status: "cancelled" },
  { id: "8", couponCode: "WELCOME5", couponName: "Welcome 5%", userId: "u2", userEmail: "user2@example.com", usedAt: "2026-03-08T17:00:00Z", offerName: "Agoda Hotels", discount: "5%", status: "redeemed" },
];

const PAGE_SIZE = 10;

export default function CouponHistoryTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let list = MOCK_HISTORY;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.couponCode.toLowerCase().includes(q) ||
          e.couponName.toLowerCase().includes(q) ||
          e.userEmail.toLowerCase().includes(q) ||
          e.offerName.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter((e) => e.status === statusFilter);
    }
    return list;
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Coupon History
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track coupon redemptions and usage. Total: {filtered.length} records
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="">All statuses</option>
            <option value="redeemed">Redeemed</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="text"
            placeholder="Search code, name, user, offer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[280px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        <div className="min-w-0 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Coupon Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Coupon Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Used At</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Offer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {paginated.map((entry, index) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-800 dark:text-gray-200">
                    {entry.couponCode}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {entry.couponName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    <div>{entry.userId}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]" title={entry.userEmail}>
                      {entry.userEmail}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                    {formatDate(entry.usedAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {entry.offerName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {entry.discount ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
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
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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
    </div>
  );
}
