"use client";

import React, { useState } from "react";
import { ConversionQuery } from "@/types/api";
import FormCoupon from "./FormCoupon";
import { CouponRequestForm, ResponseCoupon } from "@/types/coupon";
import { useQuery } from "@tanstack/react-query";
import client from "@/lib/axios/client";
export default function CouponTable() {
  const [openModal, setOpenModal] = useState<boolean | CouponRequestForm>(
    false,
  );
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
  } = useQuery<ResponseCoupon>({
    queryKey: ["get-coupon", openModal, query],
    queryFn: () =>
      client
        .get(`/offer/get-coupon`, { params: query })
        .then((res) => res.data),
    staleTime: 0,
  });

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

  // Handle offer deletion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      //   await deleteOffer(offerId);
      //   fetchOffers(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete offer:", err);
    }
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
            placeholder="Search offers..."
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden xl:w-[300px] dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
          <button
            onClick={() => {
              setOpenModal(true);
              setForm(defaultValue);
            }}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Create
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error?.message}
            <button
              onClick={() => {}}
              className="ml-2 text-red-800 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {isLoadingCoupon && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading offers...</span>
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
                          Descriptiom: {list.description}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Code: {list.code}
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
                      <td className="space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <button
                          onClick={() => {
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
                            };
                            setOpenModal(dt);
                            setForm(dt);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          // onClick={() => handleDeleteOffer(list._id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
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
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      handlePageChange(Number(couponData.page) - 1)
                    }
                    disabled={!hasPrevPage}
                    className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {couponData.page} of {couponData.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      handlePageChange(Number(couponData.page) + 1)
                    }
                    disabled={!hasNextPage}
                    className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {Number(couponData?.total) === 0 && !isLoadingCoupon && (
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
