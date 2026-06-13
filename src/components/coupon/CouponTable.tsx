"use client";

import React, { useState, useEffect, useRef } from "react";
import { ConversionQuery } from "@/types/api";
import NoData from "@/components/common/NoData";
import FormCoupon from "./FormCoupon";
import { CouponBrandCell } from "./CouponBrandCell";
import { COUPON_FORM_DEFAULTS, couponDataToForm } from "@/lib/couponForm";
import {
  formatCouponAudienceLabel,
  formatCouponCodeLabel,
  formatCouponDiscount,
  formatCouponMaxCapLabel,
  formatCouponMinSpendLabel,
  getCouponTableStatus,
} from "@/lib/couponStatus";
import { CouponData, CouponRequestForm, ResponseCoupon } from "@/types/coupon";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import SearchBar from "@/components/ui/button/SearchBar";
import { useQuery } from "@tanstack/react-query";
import client from "@/lib/axios/client";

export default function CouponTable() {
  const [openModal, setOpenModal] = useState<boolean | CouponRequestForm>(
    false,
  );
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<CouponRequestForm>(COUPON_FORM_DEFAULTS);

  const [query, setQuery] = useState<ConversionQuery>({
    search: "",
    limit: 10,
    page: 1,
    status: "",
  });

  const {
    data: couponData,
    refetch,
    isLoading: isLoadingCoupon,
    error,
    isError,
  } = useQuery<ResponseCoupon>({
    queryKey: [
      "get-coupon",
      query.page,
      query.limit,
      query.search ?? "",
      query.status ?? "",
    ],
    queryFn: () =>
      client
        .get(`/offer/get-coupon`, { params: query })
        .then((res) => res.data),
  });

  const err = error as unknown as {
    data?: { message?: string };
    status?: number;
    statusText?: string;
  } | null | undefined;
  const errorMessage =
    error instanceof Error
      ? error.message
      : err?.data?.message ||
        err?.statusText ||
        (err?.status != null ? `Request failed (${err.status})` : null) ||
        "Failed to load coupons";

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

  const handleSearch = (searchValue: string) => {
    setQuery((q) => ({ ...q, search: searchValue, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery((q) => ({ ...q, page: newPage }));
  };

  const page = Number(couponData?.page) || 1;
  const limit = Number(couponData?.limit) || 10;
  const total = couponData?.total ?? 0;
  const totalPages = couponData?.totalPages ?? 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const openCouponQuickView = (list: CouponData) => {
    const dt = couponDataToForm(list);
    setOpenModal(dt);
    setForm(dt);
    setOpenActionsId(null);
  };

  const coupons = couponData?.data ?? [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <FormCoupon
        showOfferField={true}
        fetchData={() => {
          refetch();
        }}
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />

      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-5 sm:px-6 dark:border-gray-800">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="min-w-0 shrink-0 lg:max-w-md">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Coupons
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Total: {total.toLocaleString()} coupons
                {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
              </p>
              <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                Create or search coupons below. Click a row to open the editor.
              </p>
            </div>

            <div className="flex w-full min-w-0 flex-col lg:w-auto lg:shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOpenModal(true);
                  setForm(COUPON_FORM_DEFAULTS);
                }}
                className="bg-brand-500 hover:bg-brand-600 h-11 w-full rounded-lg px-4 text-center text-sm font-medium text-white shadow-sm transition sm:w-auto"
              >
                Create coupon
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchBar
              id="coupons-toolbar-search"
              type="search"
              autoComplete="off"
              placeholder="Search name, code, or offer…"
              value={query.search ?? ""}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-[300px] max-w-full"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 dark:bg-white/[0.02]">
        {isError && error && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="shrink-0 rounded px-2 py-1 text-sm font-medium text-red-800 hover:bg-red-200 dark:text-red-300 dark:hover:bg-red-800/50"
            >
              Retry
            </button>
          </div>
        )}

        {isLoadingCoupon && (
          <div className="flex items-center justify-center py-8">
            <div className="border-t-brand-500 dark:border-t-brand-400 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Loading coupons...
            </span>
          </div>
        )}

        {!isLoadingCoupon && (
          <>
            {coupons.length > 0 && (
              <div className="-mx-4 w-full overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[920px] divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Brand
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Coupon
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Discount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {coupons.map((list, index) => {
                      const status = getCouponTableStatus(list);
                      const rowNumber = (page - 1) * limit + index + 1;

                      return (
                        <tr
                          key={list._id}
                          title="Click row for quick view"
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => openCouponQuickView(list)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                            {rowNumber}
                          </td>

                          <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                            <CouponBrandCell offer={list.offer_id} />
                          </td>

                          <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {list.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatCouponCodeLabel(list)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatCouponAudienceLabel(list)}
                              </div>
                            </div>
                          </td>

                          <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {formatCouponDiscount(list)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatCouponMinSpendLabel(list)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatCouponMaxCapLabel(list)}
                              </div>
                            </div>
                          </td>

                          <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${status.badgeClass}`}
                            >
                              {status.label}
                            </span>
                          </td>

                          <td className="relative px-4 py-3 text-sm font-medium whitespace-nowrap sm:px-6 sm:py-4">
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
                                className={`${SUPPORT_BUTTON_CLASS} gap-1`}
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
                                      openCouponQuickView(list);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, total)} of {total} results
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!hasPrevPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {(() => {
                    const current = page;
                    const pages: (number | "ellipsis")[] = [];
                    if (totalPages <= 20) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (current > 3) pages.push("ellipsis");
                      for (
                        let i = Math.max(2, current - 1);
                        i <= Math.min(totalPages - 1, current + 1);
                        i++
                      ) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      if (current < totalPages - 2) pages.push("ellipsis");
                      if (totalPages > 1) pages.push(totalPages);
                    }
                    return pages.map((p, idx) =>
                      p === "ellipsis" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1.5 py-1 text-sm text-gray-500 dark:text-gray-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          type="button"
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`min-w-[2rem] rounded border px-2.5 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 ${
                            p === current
                              ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-500/20 dark:text-brand-400 font-medium"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!hasNextPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {coupons.length === 0 && !isLoadingCoupon && (
              <NoData>No coupons found</NoData>
            )}
          </>
        )}
      </div>
    </div>
  );
}
