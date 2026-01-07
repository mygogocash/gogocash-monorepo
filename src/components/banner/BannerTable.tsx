/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { OffersQuery } from "@/types/api";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import FormUpdate from "./FormUpdate";
import { BannerData, BannerRequestForm } from "@/types/banner";

export default function BannerTable() {
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<BannerRequestForm>({
    image_1: null,
    image_2: null,
    image_3: null,
    image_4: null,
    image_5: null,
    link_1: "",
    link_2: "",
    link_3: "",
    link_4: "",
    link_5: "",
    id: "",
  });

  const [query, setQuery] = useState<OffersQuery>({
    search: "",
    limit: 10,
    page: 1,
  });

  // Fetch offers

  const {
    data: bannerData,
    refetch,
    isLoading: isLoadingBanner,
  } = useQuery<BannerData>({
    queryKey: ["getBannerHome", openModal, query],
    queryFn: () => fetcher(`/admin/banner-home`),
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
      <FormUpdate
        fetchData={refetch}
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
            Banner
          </h3>
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
        {isLoadingBanner ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading Banners...</span>
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {[1, 2, 3, 4, 5].map((item, index) => {
                    return (
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        key={index}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex-shrink-0">
                              {bannerData && (
                                <img
                                  className="h-12 w-12 rounded-lg object-cover"
                                  src={`${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${bannerData[`image_${item}` as keyof BannerData] as string}`}
                                  alt={
                                    bannerData[
                                      `link_${item}` as keyof BannerData
                                    ] as string
                                  }
                                  width={48}
                                  height={48}
                                />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {
                                  bannerData?.[
                                    `link_${item}` as keyof BannerData
                                  ] as string
                                }
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap">
                          <button
                            onClick={() => {
                              setOpenModal(true);
                              setForm({
                                image_1: bannerData?.image_1 || null,
                                image_2: bannerData?.image_2 || null,
                                image_3: bannerData?.image_3 || null,
                                image_4: bannerData?.image_4 || null,
                                image_5: bannerData?.image_5 || null,
                                link_1: bannerData?.link_1 || "",
                                link_2: bannerData?.link_2 || "",
                                link_3: bannerData?.link_3 || "",
                                link_4: bannerData?.link_4 || "",
                                link_5: bannerData?.link_5 || "",
                                id: item.toString(),
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {bannerData && !isLoadingBanner && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No Data found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
