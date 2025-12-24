/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { OffersQuery } from "@/types/api";
import Form from "./FormCategory";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { CategoryRequestForm, ResCategoryList } from "@/types/category";

export default function CategoryTable() {
  const [openModal, setOpenModal] = useState<ResCategoryList | boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<CategoryRequestForm>({
    image: null,
  });

  const [query, setQuery] = useState<OffersQuery>({
    search: "",
    limit: 10,
    page: 1,
  });

  // Fetch offers

  const {
    data: categoryData,
    refetch,
    isLoading: isLoadingCategory,
  } = useQuery<ResCategoryList[]>({
    queryKey: ["getCategory", openModal, query],
    queryFn: () =>
      fetcher(
        query?.search
          ? `/offer/get-category/list?search=${query.search}`
          : `/offer/get-category/list`,
      ),
    staleTime: 0,
  });
  // Handle search
  const handleSearch = (searchValue: string) => {
    const newQuery = { ...query, search: searchValue, page: 1 };
    setQuery(newQuery);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <Form
        fetchOffers={refetch}
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Offers
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {categoryData?.length} offers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search"
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden xl:w-[300px] dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
        {isLoadingCategory ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading Categories...</span>
          </div>
        ) : (
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
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {categoryData?.map((offer, index) => (
                    <tr
                      key={offer._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            {offer.image ? (
                              <img
                                className="h-12 w-12 rounded-lg object-cover"
                                src={`${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${offer.image}`}
                                alt={offer.name}
                                width={48}
                                height={48}
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-300">
                                <span className="text-xs font-medium text-gray-700">
                                  {offer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {offer.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <button
                          onClick={() => {
                            setOpenModal(offer);
                            setForm({
                              image: null,
                            });
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          // onClick={() => handleDeleteOffer(offer._id)}
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

            {categoryData?.length === 0 && !isLoadingCategory && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No categories found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
