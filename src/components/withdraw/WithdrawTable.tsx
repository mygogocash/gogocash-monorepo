"use client";

import React, { useState, useEffect, useRef, startTransition } from "react";
import { useApi } from "@/hooks/useApi";
import {
  DataWithdrawsList,
  ResponseWithdraws,
  WithdrawQuery,
} from "@/types/api";
import { useDataSession } from "@/hooks/useDataSession";
import ModalWithdraw from "./ModalWithdraw";
import { useRouter } from "next/navigation";
import CopyButton from "@/components/ui/CopyButton";
import { devError } from "@/lib/devConsole";
export interface WithdrawRequestForm {
  file: File | null;
  id: string;
  status: string;
}

export default function WithdrawTable() {
  const session = useDataSession();
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
  });

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

  // Fetch offers
  const fetchOffers = async (newQuery?: WithdrawQuery) => {
    try {
      const queryToUse = newQuery || query;
      const response = await getWithdraws(
        queryToUse,
        session?.accessToken || "",
      );
      setLists(response);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      });
    } catch (err) {
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
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target as Node))
        setOpenActionsId(null);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [openActionsId]);

  // Handle search
  const handleSearch = (searchValue: string) => {
    const newQuery = { ...query, search: searchValue, page: 1 };
    setQuery(newQuery);
    fetchOffers(newQuery);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const newQuery = { ...query, page: newPage };
    setQuery(newQuery);
    fetchOffers(newQuery);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format price
  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Lists
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {pagination.total}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search offers..."
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[300px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
          />
        </div>
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
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {lists?.data?.map((list, index) => (
                    <tr
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/withdraw/${list.user_id._id}?from=withdraw`);
                      }}
                      key={list._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
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
                            <p className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                              Address: {list.address || "N/A"}
                              <CopyButton value={list.address} />
                            </p>
                            <p className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                              Transaction Hash: {list.tx_hash || "N/A"}
                              <CopyButton value={list.tx_hash} />
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                              Bank Name: {list.bank_name || "N/A"}
                              <CopyButton value={list.bank_name} />
                            </p>
                            <p className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                              Account Number: {list.account_number || "N/A"}
                              <CopyButton value={list.account_number} />
                            </p>
                            <p className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                              Account Name: {list.account_name || "N/A"}
                              <CopyButton value={list.account_name} />
                            </p>
                          </>
                        )}

                        {list.currency && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Currency: {list.currency}
                          </div>
                        )}
                        <div
                          className={`text-xs ${list.status === "approved" ? "text-green-500" : list.status === "pending" ? "text-yellow-500" : "text-red-500"} dark:text-gray-400`}
                        >
                          Status: {list.status}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Created At: {formatDate(list.createdAt.toString())}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ORDER:{" "}
                          {list?.conversion_id?.length > 0 ? "GGC" : "MCB"}
                        </div>
                        <div className="max-w-[300px] overflow-auto text-xs text-gray-500 dark:text-gray-400">
                          {list.conversion_id.length > 0
                            ? `Conversion IDs: ${list.conversion_id.join(", ")}`
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
                      <td className="relative px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <div
                          ref={openActionsId === list._id ? actionsDropdownRef : undefined}
                          className="relative inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionsId((id) => (id === list._id ? null : list._id));
                            }}
                            className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            aria-expanded={openActionsId === list._id}
                            aria-haspopup="true"
                          >
                            Actions
                            <svg className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openActionsId === list._id && (
                            <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800" role="menu">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenModal(list);
                                  setForm({ id: list._id, file: null, status: list.status });
                                  setOpenActionsId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                {list.status === "pending" ? "Update" : "View"}
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
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No offers found
              </div>
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
