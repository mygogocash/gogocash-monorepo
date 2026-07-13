"use client";

import React, { useState, useEffect, useRef, startTransition } from "react";
import { useApi } from "@/hooks/useApi";
import { formatDateTime } from "@/lib/dateFormat";
import {
  DataWithdrawsList,
  ResponseWithdraws,
  WithdrawQuery,
} from "@/types/api";
import ModalWithdraw from "./ModalWithdraw";
import { useRouter } from "next/navigation";
import CopyButton from "@/components/ui/CopyButton";
import NoData from "@/components/common/NoData";
import { devError } from "@/lib/devConsole";
export interface WithdrawRequestForm {
  file: File | null;
  id: string;
  status: string;
}

export default function WithdrawTable() {
  const { loading, error, getWithdraws, clearError } = useApi();
  const [openModal, setOpenModal] = useState<DataWithdrawsList | boolean>(
    false,
  );
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [form, setForm] = useState<WithdrawRequestForm>({
    file: null,
    id: "",
    status: "",
  });
  const [lists, setLists] = useState<ResponseWithdraws>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [query, setQuery] = useState<WithdrawQuery>({
    search: "",
    limit: 10,
    page: 1,
    status: undefined,
    method: undefined,
  });

  const STATUS_FILTER_OPTIONS = [
    { value: "", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ] as const;

  const METHOD_FILTER_OPTIONS = [
    { value: "", label: "All methods" },
    { value: "bank_transfer", label: "Bank transfer" },
    { value: "web3", label: "Web3 / Crypto" },
  ] as const;

  // const { data: getDetailConversionWithdraw } = useQuery<
  //   ConversionInWithdraw[]
  // >({
  //   queryKey: ["getDetailConversionWithdraw", openModal],
  //   queryFn: () =>
  //     fetcherPost([
  //       `/admin/getConversionInWithdraw`,
  //       { data: (openModal as DataWithdrawsList).conversion_id as number[] },
  //     ]),
  // });

  // Guards: ignore out-of-order responses; debounce free-text search.
  const reqIdRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch offers
  const fetchOffers = async (newQuery?: WithdrawQuery) => {
    const reqId = ++reqIdRef.current;
    try {
      const queryToUse = newQuery || query;
      const response = await getWithdraws(queryToUse);
      if (reqId !== reqIdRef.current) return; // a newer request superseded this
      setLists(response);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      });
    } catch (err) {
      if (reqId === reqIdRef.current)
        devError("Failed to fetch withdraws:", err);
    }
  };

  // Initial load
  useEffect(() => {
    startTransition(() => {
      void fetchOffers();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!openActionsId) return;
    const handleClick = (e: MouseEvent) => {
      if (
        actionsDropdownRef.current &&
        !actionsDropdownRef.current.contains(e.target as Node)
      )
        setOpenActionsId(null);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [openActionsId]);

  // Handle search (debounced; latest response wins via reqIdRef)
  const handleSearch = (searchValue: string) => {
    const newQuery = { ...query, search: searchValue, page: 1 };
    setQuery(newQuery);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => void fetchOffers(newQuery), 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleStatusFilter = (value: string) => {
    const newQuery: WithdrawQuery = {
      ...query,
      page: 1,
      status: value ? value : undefined,
    };
    setQuery(newQuery);
    void fetchOffers(newQuery);
  };

  const handleMethodFilter = (value: string) => {
    const newQuery: WithdrawQuery = {
      ...query,
      page: 1,
      method: value ? value : undefined,
    };
    setQuery(newQuery);
    void fetchOffers(newQuery);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const newQuery = { ...query, page: newPage };
    setQuery(newQuery);
    void fetchOffers(newQuery);
  };

  // Format date as dd/mm/yyyy HH:mm:ss
  const formatDate = (dateString: string) => formatDateTime(dateString);

  // Format price
  const formatPrice = (price?: number) => {
    if (price == null || Number.isNaN(price)) return "N/A";
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

  const statusBadgeClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved")
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    if (s === "pending")
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    if (s === "rejected")
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header — title + count, then one “filter & search” card (same scan pattern as Conversion list) */}
      <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Withdrawal requests
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Status and method narrow the list; search matches text in the rows
              below.
            </p>
          </div>
          <div
            className="flex shrink-0 items-baseline gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/80"
            title="Rows matching current filters"
          >
            <span className="text-2xl font-semibold text-gray-900 tabular-nums dark:text-white">
              {pagination.total}
            </span>
            <span className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              in list
            </span>
          </div>
        </div>

        <section className="rounded-xl border border-l-4 border-gray-200 border-l-gray-400 bg-gray-50/90 p-4 pl-5 dark:border-gray-700 dark:border-l-gray-500 dark:bg-gray-900/50">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Filter & search
              </h4>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                Only changes what you see in the table — nothing is saved
                automatically.
              </p>
            </div>
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold tracking-wider text-gray-500 uppercase ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600">
              List
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <div className="sm:col-span-1 lg:col-span-3">
              <label
                htmlFor="withdraw-filter-status"
                className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                Status
              </label>
              <select
                id="withdraw-filter-status"
                value={query.status ?? ""}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="shadow-theme-xs h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1 lg:col-span-3">
              <label
                htmlFor="withdraw-filter-method"
                className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                Payout method
              </label>
              <select
                id="withdraw-filter-method"
                value={query.method ?? ""}
                onChange={(e) => handleMethodFilter(e.target.value)}
                className="shadow-theme-xs h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90"
              >
                {METHOD_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-6">
              <label
                htmlFor="withdraw-search"
                className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                Search
              </label>
              <input
                id="withdraw-search"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query.search ?? ""}
                placeholder="User, bank, amount, reference…"
                onChange={(e) => handleSearch(e.target.value)}
                className="shadow-theme-xs focus:ring-brand-500/20 dark:focus:ring-brand-400/30 h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden sm:text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Content */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
            <button
              onClick={clearError}
              className="ml-2 text-red-800 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="border-t-brand-500 dark:border-t-brand-400 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Loading...
            </span>
          </div>
        )}

        {!loading && (
          <>
            {/* Offers Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {lists?.data?.map((list, index) => (
                    <tr
                      key={list._id}
                      title="Click row for quick view"
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => {
                        setOpenActionsId(null);
                        setOpenModal(list);
                        setForm({
                          id: list._id,
                          file: null,
                          status: list.status,
                        });
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          Method: {list.method || "N/A"}
                        </div>
                        {list.method === "web3" ? (
                          <>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                              Address: {list.address || "N/A"}
                              <CopyButton
                                value={list.address?.trim() || "N/A"}
                              />
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                              Transaction Hash: {list.tx_hash || "N/A"}
                              <CopyButton
                                value={list.tx_hash?.trim() || "N/A"}
                              />
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                              Bank Name: {list.bank_name || "N/A"}
                              <CopyButton
                                value={list.bank_name?.trim() || "N/A"}
                              />
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                              Account Number: {list.account_number || "N/A"}
                              <CopyButton
                                value={list.account_number?.trim() || "N/A"}
                              />
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                              Account Name: {list.account_name || "N/A"}
                              <CopyButton
                                value={list.account_name?.trim() || "N/A"}
                              />
                            </p>
                          </>
                        )}

                        {list.currency && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Currency: {list.currency}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Created At: {formatDate(list.createdAt.toString())}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ORDER:{" "}
                          {list?.conversion_id?.length > 0 ? "GGC" : "MCB"}
                        </div>
                        <div className="max-w-[300px] overflow-auto text-xs text-gray-500 dark:text-gray-400">
                          {(list.conversion_id?.length ?? 0) > 0
                            ? `Conversion IDs: ${list.conversion_id?.join(", ")}`
                            : "No Conversion IDs"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          (Net): {formatPrice(list.amount_net)} {list.currency}
                        </p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          Total: {formatPrice(list.amount_total)}{" "}
                          {list.currency}
                        </p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          (Fee): {list.percent_fee}%
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          User: {list.user_id?.username || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {list.user_id?.email || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {list.user_id?._id || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(list.status)}`}
                        >
                          {list.status || "—"}
                        </span>
                      </td>
                      <td className="relative px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <div
                          ref={
                            openActionsId === list._id
                              ? actionsDropdownRef
                              : undefined
                          }
                          className="relative inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionsId((id) =>
                                id === list._id ? null : list._id,
                              );
                            }}
                            className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            aria-expanded={openActionsId === list._id}
                            aria-haspopup="true"
                          >
                            Actions
                            <svg
                              className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          {openActionsId === list._id && (
                            <div
                              className="absolute top-full right-auto left-0 z-50 mt-1 max-w-[min(18rem,calc(100vw-1.5rem))] min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:right-0 sm:left-auto sm:max-w-none dark:border-gray-600 dark:bg-gray-800"
                              role="menu"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenModal(list);
                                  setForm({
                                    id: list._id,
                                    file: null,
                                    status: list.status,
                                  });
                                  setOpenActionsId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                {list.status === "pending" ? "Update" : "View"}
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/withdraw/${list.user_id?._id}?from=withdraw`,
                                  );
                                  setOpenActionsId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                User withdrawal history
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tags display for debugging */}
            {Number(lists?.pagination.total) > 0 && lists && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {/* Sample tags: {offers.} */}
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!hasPrevPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!hasNextPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {Number(lists?.pagination.total) === 0 && !loading && (
              <NoData>No offers found</NoData>
            )}
          </>
        )}

        <ModalWithdraw
          openModal={openModal}
          setOpenModal={setOpenModal}
          form={form}
          setForm={setForm}
          fetchData={fetchOffers}
        />
      </div>
    </div>
  );
}
