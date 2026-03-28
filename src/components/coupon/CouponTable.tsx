"use client";

import React, { useState, useEffect, useRef } from "react";
import { ConversionQuery } from "@/types/api";
import FormCoupon from "./FormCoupon";
import { CouponRequestForm, ResponseCoupon } from "@/types/coupon";
import { useQuery } from "@tanstack/react-query";
import client from "@/lib/axios/client";
export default function CouponTable() {
  const [openModal, setOpenModal] = useState<boolean | CouponRequestForm>(
    false,
  );
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const defaultValue = {
    name: "",
    description: "",
    code: "",
    offer_id: "",
    start_date: "",
    end_date: "",
    eligibility: "",
    min_spend: "",
    discount: 0,
  };
  const [form, setForm] = useState<CouponRequestForm>(defaultValue);

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

  const err = error as unknown as { data?: { message?: string }; status?: number; statusText?: string } | null | undefined;
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
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const newQuery = { ...query, page: newPage };
    setQuery(newQuery);
  };

  // Format date

  const hasNextPage = Number(couponData?.page) < Number(couponData?.totalPages);
  const hasPrevPage = Number(couponData?.page) > 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <FormCoupon
        showOfferField={true}
        fetchData={function (): void {
          refetch();
          //   throw new Error("Function not implemented.");
        }}
        openModal={openModal}
        setOpenModal={function (
          value: React.SetStateAction<boolean | CouponRequestForm>,
        ): void {
          setOpenModal(value);
        }}
        form={form}
        setForm={function (
          value: React.SetStateAction<CouponRequestForm>,
        ): void {
          setForm(value);
        }}
        isLoading={isLoading}
        setIsLoading={function (value: React.SetStateAction<boolean>): void {
          setIsLoading(value);
        }}
      />
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Lists
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {couponData?.total}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search coupons..."
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[300px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
          />
          <button
            onClick={() => {
              setOpenModal(true);
              setForm(defaultValue);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Create
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
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
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        )}

        {!isLoadingCoupon && (
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
                      Offer name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Deatil
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
                  {couponData?.data?.map((list, index) => (
                    <tr
                      key={list._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {list.offer_id?.offer_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Name: {list.name}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Link: {list.link}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Code: {list.code}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Descriptiom: {list.description}
                        </div>

                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Date: {list.start_date} - {list.end_date}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Min Spend: {list.min_spend}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Discount: {list.discount}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Eligibility: {list.eligibility}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            list.disabled
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          }`}
                        >
                          {list.disabled ? "Inactive" : "Active"}
                        </span>
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
                                  const dt = {
                                    name: list.name,
                                    description: list.description,
                                    code: list.code,
                                    offer_id: list.offer_id._id,
                                    start_date: list.start_date,
                                    end_date: list.end_date,
                                    eligibility: list.eligibility,
                                    min_spend: list.min_spend,
                                    discount: list.discount,
                                    id: list._id,
                                    link: list.link,
                                  };
                                  setOpenModal(dt);
                                  setForm(dt);
                                  setOpenActionsId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Edit
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
            {Number(couponData?.total) > 0 && couponData && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {/* Sample tags: {offers.} */}
                </div>
              </div>
            )}

            {/* Pagination */}
            {couponData && couponData?.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing{" "}
                  {(Number(couponData.page) - 1) * Number(couponData.limit) + 1}{" "}
                  to{" "}
                  {Math.min(
                    Number(couponData.page) * Number(couponData.limit),
                    couponData.total,
                  )}{" "}
                  of {couponData.total} results
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() =>
                      handlePageChange(Number(couponData.page) - 1)
                    }
                    disabled={!hasPrevPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    Page {couponData.page} of {couponData.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      handlePageChange(Number(couponData.page) + 1)
                    }
                    disabled={!hasNextPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {Number(couponData?.total) === 0 && !isLoadingCoupon && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No coupons found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
