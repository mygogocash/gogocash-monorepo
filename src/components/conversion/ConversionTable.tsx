"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import {
  ConversionQuery,
  DataConversion,
  ResponseConversion,
  WithdrawQuery,
} from "@/types/api";
import { useSession } from "next-auth/react";
import client from "@/lib/axios/client";
import { Modal } from "@/components/ui/modal";

export default function ConversionTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data } = useSession();
  const session = data as { accessToken?: string };
  const { loading, error, getConversion, deleteOffer, clearError } = useApi();

  const [lists, setLists] = useState<ResponseConversion>();
  const [conversionId, setConversionId] = useState<string>("");
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [viewConversion, setViewConversion] = useState<DataConversion | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  const STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "paid", label: "Paid" },
    { value: "yet to consume", label: "Yet to consumed" },
    { value: "invalid", label: "Invalid" },
  ];

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [query, setQuery] = useState<ConversionQuery>({
    search: "",
    limit: 10,
    page: 1,
    status: "",
    key: "",
  });

  // Fetch offers
  const fetchOffers = async (newQuery?: WithdrawQuery) => {
    try {
      const queryToUse = newQuery || query;
      const response = await getConversion(
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
      console.error("Failed to fetch offers:", err);
    }
  };

  // Initial load: use ?search= from URL when opened from Offers "View conversions"
  useEffect(() => {
    const initialSearch = searchParams.get("search") ?? "";
    if (initialSearch) {
      const q = { ...query, search: initialSearch, page: 1 };
      setQuery(q);
      fetchOffers(q);
    } else {
      fetchOffers();
    }
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

  const handleFilterStatus = (status: string) => {
    const newQuery = { ...query, status, page: 1 };
    setQuery(newQuery);
    fetchOffers(newQuery);
  };

  const handleFilterKey = (key: string) => {
    const newQuery = { ...query, key, page: 1 };
    setQuery(newQuery);
    fetchOffers(newQuery);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const newQuery = { ...query, page: newPage };
    setQuery(newQuery);
    fetchOffers(newQuery);
  };

  // Handle offer deletion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      await deleteOffer(offerId);
      fetchOffers(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete offer:", err);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format price
  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(price);
  };

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

  const handleUpdateConversion = async () => {
    if (!conversionId) {
      alert("Please enter a conversion ID");
      return;
    }
    try {
      const response = await client.patch(
        `/admin/update-conversion/${conversionId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        },
      );
      if (response.status === 200) {
        alert("Conversion updated successfully");
        fetchOffers();
      }
    } catch (err) {
      console.error("Failed to update conversion:", err);
    }
  };

  const handleStatusChange = async (conversionId: number, newStatus: string) => {
    setUpdatingStatusId(conversionId);
    try {
      await client.patch(
        `/admin/update-conversion/${conversionId}`,
        { conversion_status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      fetchOffers();
    } catch (err) {
      console.error("Failed to update conversion status:", err);
    } finally {
      setUpdatingStatusId(null);
    }
  };
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* View conversion & user data modal */}
      <Modal
        isOpen={!!viewConversion}
        onClose={() => setViewConversion(null)}
        isFullscreen
        showCloseButton={false}
        className="p-0"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6 md:p-8">
          <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <div className="min-w-0">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                Conversion & user data
              </h4>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setViewConversion(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
          {viewConversion && (
            <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
              <section className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-800/40">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Conversion
                </h5>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">ID</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">{viewConversion.conversion_id}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Offer</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">{viewConversion.offer_name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Sale amount</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(Number(viewConversion.sale_amount), viewConversion.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Payout</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(Number(viewConversion.payout), viewConversion.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 capitalize">{viewConversion.conversion_status}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Date</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(viewConversion.datetime_conversion?.toString())}
                    </dd>
                  </div>
                  {(viewConversion.adv_sub1 || viewConversion.adv_sub2) && (
                    <div className="border-t border-gray-200 pt-2 dark:border-gray-600">
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Detail (adv_sub)</dt>
                      <dd className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                        {[viewConversion.adv_sub1, viewConversion.adv_sub2, viewConversion.adv_sub3].filter(Boolean).join(" · ")}
                      </dd>
                    </div>
                  )}
                  {viewConversion.remark && (
                    <div className="border-t border-gray-200 pt-2 dark:border-gray-600">
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Remark</dt>
                      <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">{viewConversion.remark}</dd>
                    </div>
                  )}
                </dl>
              </section>
              <section className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-800/40">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  User
                </h5>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">User ID</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 break-all">
                      {viewConversion.aff_sub1 ?? viewConversion.user?._id ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Username</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {viewConversion.user?.username ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 break-all">
                      {viewConversion.user?.email ?? "—"}
                    </dd>
                  </div>
                  {viewConversion.user?.address && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500 dark:text-gray-400">Address</dt>
                      <dd className="font-medium text-gray-900 dark:text-gray-100 break-all text-xs">
                        {viewConversion.user.address}
                      </dd>
                    </div>
                  )}
                </dl>
                {(viewConversion.aff_sub1 ?? viewConversion.user?._id) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => {
                        const userId = viewConversion.aff_sub1 ?? viewConversion.user?._id ?? "";
                        setViewConversion(null);
                        router.push(`/users?search=${encodeURIComponent(userId)}`);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-500 bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      View user info
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </Modal>

      {/* Header */}
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Lists
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {pagination.total}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
          <select
            onChange={(e) => handleFilterKey(e.target.value)}
            value={query.key}
            className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="aff_sub1">User Id</option>
            <option value="conversion_id">Conversion Id</option>
            <option value="adv_sub1">Order Id 1</option>
            <option value="adv_sub2">Order Id 2</option>
            <option value="adv_sub3">Order Id 3</option>
            <option value="adv_sub4">Order Id 4</option>
          </select>
          <input
            type="text"
            placeholder="Search offers..."
            value={query.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[300px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
          />
          <select onChange={(e) => handleFilterStatus(e.target.value)} className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
            <option value="yet to consume">Yet to consumed</option>
            <option value="invalid">Invalid</option>
          </select>
          <div className="flex flex-wrap items-center gap-2 border-l border-gray-200 pl-4 dark:border-gray-600 sm:gap-3">
            <span className="shrink-0 text-sm text-gray-700 dark:text-gray-300">
              Update Conversion (Ex. 670041412|671101377)
            </span>
            <input
              type="text"
              placeholder="conversion id"
              onChange={(e) => setConversionId(e.target.value)}
              className="h-11 w-full max-w-[200px] rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 sm:max-w-[180px]"
            />
            <button
              onClick={handleUpdateConversion}
              className="shrink-0 rounded-lg border border-brand-500 bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              Update
            </button>
          </div>
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
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading offers...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Offers Table */}
            <div className="min-w-0 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      ShopName
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Detail
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {lists?.data?.map((list, index) => (
                    <tr
                      key={list.conversion_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {list.offer_name} ({list.conversion_id})
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <p>
                            date:{" "}
                            {formatDate(list.datetime_conversion?.toString())}
                          </p>
                          <p>
                            created: {formatDate(list.createdAt?.toString())}
                          </p>
                          <p>
                            updated: {formatDate(list.updatedAt?.toString())}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          sale_amount:{" "}
                          {formatPrice(
                            Number(list.sale_amount),
                            list.currency,
                          )}{" "}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          payout:{" "}
                          {formatPrice(Number(list.payout), list.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {list?.aff_sub1 ||
                            list?.user?.username ||
                            list?.user?.email ||
                            "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {list.adv_sub1} <br /> {list.adv_sub2} <br />{" "}
                          {list.adv_sub3}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {list.adv_sub4} <br /> {list.adv_sub5}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={list.conversion_status ?? ""}
                          onChange={(e) => handleStatusChange(list.conversion_id, e.target.value)}
                          disabled={updatingStatusId === list.conversion_id}
                          className="min-w-[120px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:ring-brand-400/20 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {updatingStatusId === list.conversion_id && (
                          <span className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-600 dark:border-t-brand-400" />
                        )}
                      </td>
                      <td className="relative px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <div
                          ref={openActionsId === String(list.conversion_id) ? actionsDropdownRef : undefined}
                          className="relative inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const id = String(list.conversion_id);
                              setOpenActionsId((prev) => (prev === id ? null : id));
                            }}
                            className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            aria-expanded={openActionsId === String(list.conversion_id)}
                            aria-haspopup="true"
                          >
                            Actions
                            <svg className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openActionsId === String(list.conversion_id) && (
                            <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800" role="menu">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewConversion(list);
                                  setOpenActionsId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                View
                              </button>
                              <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                                Delete
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
      </div>
    </div>
  );
}
