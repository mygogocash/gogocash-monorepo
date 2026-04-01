"use client";

import client from "@/lib/axios/client";
import { devError } from "@/lib/devConsole";
import type { MyCashbackResponse } from "@/types/user";
import { useCallback, useEffect, useState } from "react";
import ViewMyCashback from "./ViewMyCashback";

type ListResponse = {
  status?: string;
  data: MyCashbackResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const PAGE_SIZE = 12;

export default function MyCashbackUsersTable() {
  const [rows, setRows] = useState<MyCashbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [detailId, setDetailId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const q = searchInput.trim();
    if (q === "") {
      setSearchQuery("");
      return;
    }
    const t = setTimeout(() => setSearchQuery(q), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const fetchList = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.post<ListResponse>("/admin/list-mycashback-users", {
        page: p,
        limit: PAGE_SIZE,
        search: q,
      });
      const body = res.data;
      setRows(body.data ?? []);
      setPagination({
        limit: body.pagination?.limit ?? PAGE_SIZE,
        total: body.pagination?.total ?? 0,
        totalPages: body.pagination?.totalPages ?? 1,
      });
    } catch (e: unknown) {
      devError("MyCashback list failed:", e);
      const ax = e as { data?: { message?: string } };
      setError(ax?.data?.message ?? "Failed to load MyCashBack users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList(page, searchQuery);
  }, [page, searchQuery, fetchList]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const hasNextPage = page < pagination.totalPages;
  const hasPrevPage = page > 1;

  const primaryBalance = (u: MyCashbackResponse) => {
    const b = u.balance?.[0];
    return b ? `${b.amount} ${b.currency}` : "—";
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <ViewMyCashback
        id={detailId}
        openModal={detailOpen}
        setOpenModal={setDetailOpen}
      />
      <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            MyCashBack Users
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            App users on the MyCashBack program. Total:{" "}
            {pagination.total.toLocaleString()}
          </p>
        </div>
        <input
          type="search"
          placeholder="Search by name, email, phone, buyer ID…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[320px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
        />
      </div>

      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Loading…
            </span>
          </div>
        )}

        {!loading && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Buyer ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No MyCashBack users match your search.
                      </td>
                    </tr>
                  ) : (
                    rows.map((u) => (
                      <tr
                        key={u._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/80"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {u.firstName} {u.lastName}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {u._id}
                          </div>
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                          {u.email}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-800 dark:text-gray-200">
                          {u.phoneNumber}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                          {u.buyerId}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                          {primaryBalance(u)}
                        </td>
                        <td className="px-4 py-3">
                          {u.banned ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">
                              Banned
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailId(u._id);
                              setDetailOpen(true);
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            View cashback
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total.toLocaleString()}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!hasPrevPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!hasNextPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
