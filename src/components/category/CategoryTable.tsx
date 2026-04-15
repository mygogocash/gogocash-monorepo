"use client";

import React, { useState, useEffect, useRef } from "react";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { OffersQuery } from "@/types/api";
import Form from "./FormCategory";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { pathImage } from "@/utils/helper";
import { CategoryRequestForm, ResCategoryList } from "@/types/category";

export default function CategoryTable() {
  const [openModal, setOpenModal] = useState<ResCategoryList | boolean>(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<CategoryRequestForm>({
    image: null,
    banner: null,
  });

  useEffect(() => {
    if (!openActionsId) return;
    const handleClick = (e: MouseEvent) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target as Node))
        setOpenActionsId(null);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [openActionsId]);

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
    queryKey: ["getCategory", query.search ?? ""],
    queryFn: () =>
      fetcher(
        query?.search
          ? `/offer/get-category/list?search=${query.search}`
          : `/offer/get-category/list`,
      ),
  });
  // Handle search
  const handleSearch = (searchValue: string) => {
    const newQuery = { ...query, search: searchValue, page: 1 };
    setQuery(newQuery);
  };

  const openCategoryQuickView = (offer: ResCategoryList) => {
    setOpenActionsId(null);
    setOpenModal(offer);
    setForm({ image: null, banner: null });
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
            Brands
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {categoryData?.length} brands
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search"
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[300px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
          />
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-gray-100 p-4 sm:p-6 dark:border-gray-700 dark:bg-white/[0.02]">
        {isLoadingCategory ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        ) : (
          <>
            {/* Brands table */}
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
                      Banner
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
                      title="Click row for quick view"
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => openCategoryQuickView(offer)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            {offer.image ? (
                              <RemoteOrBlobImage
                                className="h-12 w-12 rounded-lg object-cover"
                                src={pathImage(offer.image)}
                                alt={offer.name}
                                width={48}
                                height={48}
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-300 dark:bg-gray-600">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {offer.banner ? (
                          <RemoteOrBlobImage
                            className="h-14 w-36 rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                            src={pathImage(offer.banner, "banner")}
                            alt={`${offer.name} banner`}
                            width={144}
                            height={56}
                          />
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="relative px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <div
                          ref={openActionsId === offer._id ? actionsDropdownRef : undefined}
                          className="relative inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionsId((id) => (id === offer._id ? null : offer._id));
                            }}
                            className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            aria-expanded={openActionsId === offer._id}
                            aria-haspopup="true"
                          >
                            Actions
                            <svg className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openActionsId === offer._id && (
                            <div className="absolute left-0 right-auto top-full z-50 mt-1 min-w-[10rem] max-w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 sm:left-auto sm:right-0 sm:max-w-none" role="menu">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCategoryQuickView(offer);
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
