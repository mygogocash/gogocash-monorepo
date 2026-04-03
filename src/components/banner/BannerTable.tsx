"use client";

import React, { useState, useEffect, useRef } from "react";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { OffersQuery } from "@/types/api";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import FormUpdate from "./FormUpdate";
import { pathImage } from "@/utils/helper";
import { BannerData, BannerRequestForm } from "@/types/banner";

export default function BannerTable() {
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
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
    start_date: "",
    end_date: "",
    end_forever: true,
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
    queryKey: ["getBannerHome"],
    queryFn: () => fetcher(`/admin/banner-home`),
  });
  // Handle search
  const handleSearch = (searchValue: string) => {
    const newQuery = { ...query, search: searchValue, page: 1 };
    setQuery(newQuery);
  };

  useEffect(() => {
    if (!openActionsId) return;
    const handleClick = (e: MouseEvent) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target as Node))
        setOpenActionsId(null);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [openActionsId]);

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
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Home Page Banner
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/banner/modal-popups"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Modal popups
          </Link>
          <Link
            href="/banner/popup-history"
            className="inline-flex items-center justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30"
          >
            Popup history
          </Link>
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
        {isLoadingBanner ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        ) : (
          <>
            {/* Banner Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Link
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {[1, 2, 3, 4, 5].map((item, index) => {
                    const imageId = bannerData?.[`image_${item}` as keyof BannerData] as string | null | undefined;
                    const link = (bannerData?.[`link_${item}` as keyof BannerData] as string) || "";
                    const imageSrc = imageId ? pathImage(imageId) || `https://placehold.co/96x96/e2e8f0/64748b?text=Banner+${item}` : null;

                    return (
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        key={index}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {imageSrc ? (
                            <RemoteOrBlobImage
                              className="h-14 w-20 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                              src={imageSrc}
                              alt={link || `Banner ${item}`}
                              width={80}
                              height={56}
                            />
                          ) : (
                            <span className="inline-flex h-14 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              No image
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 min-w-0 max-w-md">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {link}
                            </a>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="relative px-6 py-4 text-sm font-medium whitespace-nowrap">
                          <div
                            ref={openActionsId === `banner-${index}` ? actionsDropdownRef : undefined}
                            className="relative inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const id = `banner-${index}`;
                                setOpenActionsId((prev) => (prev === id ? null : id));
                              }}
                              className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-expanded={openActionsId === `banner-${index}`}
                              aria-haspopup="true"
                            >
                              Actions
                              <svg className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {openActionsId === `banner-${index}` && (
                              <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800" role="menu">
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenModal(true);
                                    setForm(() => {
                                      const endRaw = bannerData?.end_date ?? "";
                                      const hasEnd = Boolean(String(endRaw).trim());
                                      return {
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
                                        start_date: bannerData?.start_date ?? "",
                                        end_date: hasEnd ? String(endRaw) : "",
                                        end_forever: !hasEnd,
                                        id: item.toString(),
                                      };
                                    });
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
