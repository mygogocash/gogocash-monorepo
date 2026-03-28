"use client";

import React, { useState, useEffect, useRef, startTransition } from "react";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { useApi } from "@/hooks/useApi";
import { Offer, OfferRequestForm, OffersQuery } from "@/types/api";
import { pathImage } from "@/utils/helper";
import { useSession } from "next-auth/react";
import FormOffer from "./FormOffer";
import { useRouter } from "next/navigation";
import Select from "../form/Select";

function offerToEditForm(offer: Offer): OfferRequestForm {
  return {
    logo_desktop: null,
    logo_mobile: null,
    id: offer._id,
    offer_name_display: offer.offer_name_display || offer.offer_name,
    banner: null,
    logo_circle: null,
    disabled: offer.disabled,
    max_cap: offer.max_cap,
    commission_store: offer.commission_store,
    banner_mobile: null,
    extra_store: offer.extra_store || false,
    upsize_start_date: offer.upsize_start_date ?? null,
    upsize_end_date: offer.upsize_end_date ?? null,
    upsize_special_commission: offer.upsize_special_commission ?? null,
    upsize_max_cap: offer.upsize_max_cap ?? null,
  };
}

export default function OffersTable() {
  const [openModal, setOpenModal] = useState<Offer | boolean>(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState<OfferRequestForm>({
    logo_desktop: null,
    logo_mobile: null,
    banner: null,
    logo_circle: null,
    offer_name_display: "",
    disabled: false,
    max_cap: null,
    commission_store: null,
    id: "",
    banner_mobile: null,
    extra_store: false,
    upsize_start_date: null,
    upsize_end_date: null,
    upsize_special_commission: null,
    upsize_max_cap: null,
  });
  const { data } = useSession();
  const session = data as { accessToken?: string };

  const {
    loading,
    error,
    getOffers,
    deleteOffer,
    clearError,
    updateListOffer,
    setLoading,
  } = useApi();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [query, setQuery] = useState<OffersQuery>({
    search: "",
    limit: 10,
    page: 1,
    country: "",
  });

  // Fetch offers
  const fetchOffers = async (newQuery?: OffersQuery) => {
    try {
      const queryToUse = newQuery || query;
      const response = await getOffers(queryToUse);
      setOffers(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err) {
      console.error("Failed to fetch offers:", err);
    }
  };

  // Initial load
  useEffect(() => {
    startTransition(() => {
      void fetchOffers();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close actions dropdown when clicking outside
  useEffect(() => {
    if (!openActionsId) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(target)) {
        setOpenActionsId(null);
      }
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

  // Handle offer deletion
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      await deleteOffer(offerId);
      fetchOffers(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete offer:", err);
    }
  };

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

  const openEditOfferModal = (offer: Offer) => {
    setForm(offerToEditForm(offer));
    setOpenModal(offer);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <FormOffer
        fetchOffers={fetchOffers}
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
            Total: {pagination.total} offers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setLoading(true);
              updateListOffer(
                (session as { accessToken?: string })?.accessToken || "",
              )
                .then(() => fetchOffers())
                .finally(() => setLoading(false));
            }}
            className="shadow-theme-xs flex w-full min-w-[130px] items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 lg:inline-flex lg:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            Update Offer
          </button>
          <input
            type="text"
            placeholder="Search offers..."
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden xl:w-[300px] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-brand-400/30"
          />
          <Select
            options={[
              { label: "All", value: "" },
              { label: "🇹🇭 Thailand", value: "Thailand" },
              { label: "🇮🇩 Indonesia", value: "Indonesia" },
              { label: "🇻🇳 Vietnam", value: "Vietnam" },
              { label: "🇵🇭 Philippines", value: "Philippines" },
              { label: "🇮🇳 India", value: "India" },
              { label: "🇲🇾 Malaysia", value: "Malaysia" },
              { label: "🇧🇷 Brazil", value: "Brazil" },
              {
                label: "🇺🇸 United States of America",
                value: "United States of America",
              },
              { label: "🇬🇧 United Kingdom", value: "United Kingdom" },
              { label: "🇸🇬 Singapore", value: "Singapore" },
              { label: "🇲🇲 Myanmar", value: "Myanmar" },
            ]}
            placeholder="Select country"
            onChange={(e) => {
              const newQuery = { ...query, country: e, page: 1 };
              setQuery(newQuery);
              fetchOffers(newQuery);
            }}
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
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading offers...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Offers Table */}
            <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[800px] divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Offer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Logo desktop
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Logo mobile
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Bannner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Logo circle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Max Cap
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Max Commission
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {offers.map((offer, index) => {
                    const logoDesktopSrc = pathImage(offer.logo_desktop);
                    const logoMobileSrc = pathImage(offer.logo_mobile);
                    const bannerSrc = pathImage(offer.banner);
                    const logoCircleSrc = pathImage(offer.logo_circle);
                    const has = (s: string) => typeof s === "string" && s.length > 0;
                    return (
                    <tr
                      key={offer._id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => {
                        openEditOfferModal(offer);
                      }}
                    >
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                        {index + 1}
                      </td>
                      <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            {offer.logo ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={offer.logo}
                                alt={offer.offer_name}
                                width={48}
                                height={48}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-300 dark:bg-gray-600 sm:h-12 sm:w-12">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                  {offer.offer_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-2 min-w-0 sm:ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {offer.offer_name}
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              New Name:{" "}
                              {offer.offer_name_display
                                ? offer.offer_name_display
                                : "N/A"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {offer.description
                                ? offer.description.substring(0, 50) +
                                  (offer.description.length > 50 ? "..." : "")
                                : "No description"}
                            </div>
                            {offer.disabled && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                Disabled:{" "}
                                {offer.disabled ? "Disabled" : "Enabled"}
                              </div>
                            )}
                            {offer.categories && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                {offer.categories}
                              </div>
                            )}
                            {offer.countries && (
                              <div className="">
                                countries:{" "}
                                <div className="max-h-[100px] overflow-auto text-xs text-gray-400 dark:text-gray-500">
                                  {offer.countries?.split(",")?.map((c) => (
                                    <p key={c.trim()}>{c.trim()}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
                            {has(logoDesktopSrc) ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={logoDesktopSrc}
                                alt={offer.offer_name}
                                width={48}
                                height={48}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 sm:h-12 sm:w-12 text-xs text-gray-500 dark:text-gray-400">—</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
                            {has(logoMobileSrc) ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={logoMobileSrc}
                                alt={offer.offer_name}
                                width={48}
                                height={48}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 sm:h-12 sm:w-12 text-xs text-gray-500 dark:text-gray-400">—</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
                            {has(bannerSrc) ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={bannerSrc}
                                alt={offer.offer_name}
                                width={48}
                                height={48}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 sm:h-12 sm:w-12 text-xs text-gray-500 dark:text-gray-400">—</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
                            {has(logoCircleSrc) ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={logoCircleSrc}
                                alt={offer.offer_name}
                                width={48}
                                height={48}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 sm:h-12 sm:w-12 text-xs text-gray-500 dark:text-gray-400">—</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
                          {offer.categories || "Uncategorized"}
                        </div>
                        {offer.currency && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Currency: {offer.currency}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 dark:text-gray-100">
                        {offer.max_cap != null ? offer.max_cap.toLocaleString() : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 dark:text-gray-100">
                        {offer.commission_store != null ? `${offer.commission_store}%` : "—"}
                      </td>
                      <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold break-words ${
                            offer.tracking_type === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : offer.tracking_type === "expired"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {offer.tracking_type || "Active"}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap px-4 py-3 text-sm font-medium sm:px-6 sm:py-4">
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
                            <div
                              className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                              role="menu"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditOfferModal(offer);
                                  setOpenActionsId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/offers/${offer._id}`);
                                  setOpenActionsId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                View detail
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const q = encodeURIComponent(offer.offer_name || String(offer.offer_id ?? offer._id));
                                  router.push(`/conversion?search=${q}`);
                                  setOpenActionsId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                View conversions
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOffer(offer._id);
                                  setOpenActionsId(null);
                                }}
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

            {/* Tags display for debugging */}
            {offers.length > 0 && offers && (
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
                <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!hasPrevPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {(() => {
                    const total = pagination.totalPages;
                    const current = pagination.page;
                    const pages: (number | "ellipsis")[] = [];
                    if (total <= 20) {
                      for (let i = 1; i <= total; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (current > 3) pages.push("ellipsis");
                      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      if (current < total - 2) pages.push("ellipsis");
                      if (total > 1) pages.push(total);
                    }
                    return pages.map((p, idx) =>
                      p === "ellipsis" ? (
                        <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-sm text-gray-500 dark:text-gray-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`min-w-[2rem] rounded border px-2.5 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 ${
                            p === current
                              ? "border-brand-500 bg-brand-50 font-medium text-brand-600 dark:border-brand-500 dark:bg-brand-500/20 dark:text-brand-400"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}
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

            {offers.length === 0 && !loading && (
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
