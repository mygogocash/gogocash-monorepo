"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import NoData from "@/components/common/NoData";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { appLinks } from "@/lib/appLinks";
import { isUpsizeActiveNow } from "@/lib/upsizeStatus";
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import {
  Offer,
  OfferRequestForm,
  OffersQuery,
} from "@/types/api";
import {
  emptyOfferRequestForm,
  offerToEditForm,
} from "@/lib/offerEditForm";
import { pathImage } from "@/utils/helper";
import { resolveAdminOfferLogoPath } from "@/lib/offerDisplay";
import { getOfferAvailabilityDisplay } from "@/lib/offerAvailabilityDisplay";
import { devError } from "@/lib/devConsole";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import FormOffer from "./FormOffer";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SearchBar from "@/components/ui/button/SearchBar";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import { OFFER_THUMB_SIZES } from "./offerMedia";
import { OFFERS_COUNTRY_FILTER_OPTIONS } from "@/lib/offerCountries";

export function offerVisibilityStatusLabel(
  disabled: boolean,
): "Hidden" | "Live" {
  return disabled ? "Hidden" : "Live";
}

/**
 * Brand-grouping key — same logic as the customer-side `dedupeOffersByBrand`.
 * `merchant_id` is the strongest grouping signal (one merchant id across markets); falls
 * back to `lookup_value` with the country suffix stripped (e.g. `apple_th` → `apple`).
 */
function brandGroupKey(offer: Offer): string {
  if (offer.merchant_id && offer.merchant_id > 0)
    return `mid:${offer.merchant_id}`;
  if (offer.lookup_value) {
    const stem = String(offer.lookup_value).replace(/_[a-z]{2}$/i, "");
    if (stem) return `lv:${stem}`;
  }
  return `id:${offer._id}`;
}

/** Display name for a brand group — strips trailing `(TH)` / `- TH` style suffixes. */
function brandGroupDisplayName(offer: Offer): string {
  const name = (offer.offer_name || "").trim();
  // Drop common country suffix patterns; admins write them inconsistently.
  return (
    name
      .replace(/\s*[-–—]\s*(TH|SG|ID|MY|PH|VN|US|UK|GB)\b.*$/i, "")
      .replace(/\s*\((TH|SG|ID|MY|PH|VN|US|UK|GB)\)\s*$/i, "")
      .trim() || name
  );
}

interface OffersTableProps {
  /** Inline editor state, lifted to the parent so the page breadcrumb can close it. */
  openModal: Offer | boolean;
  setOpenModal: React.Dispatch<React.SetStateAction<Offer | boolean>>;
}

export default function OffersTable({
  openModal,
  setOpenModal,
}: OffersTableProps) {
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<{
    _id: string;
    name: string;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  // "Now" captured once at mount — drives the live "Upsize" status tag.
  const [nowMs] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState<OfferRequestForm>(emptyOfferRequestForm());
  const queryClient = useQueryClient();
  const [query, setQuery] = useState<OffersQuery>({
    search: "",
    limit: 10,
    page: 1,
    country: "",
  });

  const listQueryKey = useMemo(() => offersListQueryKey(query), [query]);

  const {
    data: offersResponse,
    isLoading: offersLoading,
    error: offersError,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => fetchOffersList(query),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const offers = useMemo(() => offersResponse?.data ?? [], [offersResponse]);

  /**
   * View mode: "flat" lists every offer row independently (current behavior); "grouped" buckets
   * country variants of the same brand under a collapsible parent row so admins see "Apple" once
   * with a TH · SG · ID summary instead of three unrelated rows.
   */
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat");
  const [expandedBrandKeys, setExpandedBrandKeys] = useState<Set<string>>(
    new Set(),
  );

  const brandGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        variants: Offer[];
        isAnyGlobal: boolean;
        globalFallbackCountry: string | null;
        availabilityClarification: string | null;
      }
    >();
    const order: string[] = [];
    for (const o of offers) {
      const key = brandGroupKey(o);
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: brandGroupDisplayName(o),
          variants: [],
          isAnyGlobal: false,
          globalFallbackCountry: null,
          availabilityClarification: null,
        });
        order.push(key);
      }
      const g = map.get(key)!;
      g.variants.push(o);
      const availability = getOfferAvailabilityDisplay(o);
      if (availability.isGlobal) {
        g.isAnyGlobal = true;
        g.globalFallbackCountry ??= availability.fallbackCountry;
      }
      g.availabilityClarification ??= availability.clarification;
    }
    return order.map((k) => map.get(k)!);
  }, [offers]);

  const toggleBrandExpand = (key: string) => {
    setExpandedBrandKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAllBrands = () =>
    setExpandedBrandKeys(new Set(brandGroups.map((g) => g.key)));
  const collapseAllBrands = () => setExpandedBrandKeys(new Set());
  const pagination = useMemo(
    () =>
      offersResponse
        ? {
            page: offersResponse.page,
            limit: offersResponse.limit,
            total: offersResponse.total,
            totalPages: offersResponse.totalPages,
          }
        : { page: 1, limit: 10, total: 0, totalPages: 1 },
    [offersResponse],
  );

  const invalidateOffersList = () => {
    void queryClient.invalidateQueries({ queryKey: ["offers", "list"] });
  };

  const deleteOfferMutation = useMutation({
    mutationFn: (offerId: string) => apiClient.deleteOffer(offerId),
    onSuccess: invalidateOffersList,
    onError: (err) => devError("Failed to delete offer:", err),
  });

  const updateListMutation = useMutation({
    mutationFn: () => apiClient.updateListOffer(),
    onSuccess: invalidateOffersList,
    onError: (err) => devError("Failed to update offer list:", err),
  });

  const listErrorMessage =
    offersError instanceof Error
      ? offersError.message
      : offersError
        ? String(offersError)
        : null;

  // Close actions dropdown when clicking outside
  useEffect(() => {
    if (!openActionsId) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        actionsDropdownRef.current &&
        !actionsDropdownRef.current.contains(target)
      ) {
        setOpenActionsId(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openActionsId]);

  const openDeleteConfirm = (offer: Offer) => {
    setOfferToDelete({
      _id: offer._id,
      name: offer.offer_name_display || offer.offer_name,
    });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteOffer = async () => {
    if (!offerToDelete) return;
    try {
      await deleteOfferMutation.mutateAsync(offerToDelete._id);
      toast.success(`Deleted “${offerToDelete.name}”.`);
      setDeleteConfirmOpen(false);
      setOfferToDelete(null);
    } catch (err) {
      devError("Failed to delete offer:", err);
      toast.error(getApiErrorMessage(err, "Could not delete offer."));
    }
  };

  const handleSearch = (searchValue: string) => {
    setQuery((q) => ({ ...q, search: searchValue, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery((q) => ({ ...q, page: newPage }));
  };

  const hasNextPage = pagination.page < pagination.totalPages;
  const hasPrevPage = pagination.page > 1;

  const openEditOfferModal = (offer: Offer) => {
    setForm(offerToEditForm(offer));
    setOpenModal(offer);
  };

  // Inline editor: when an offer is open, render the editor in the page content
  // area (under the AppHeader + AppSidebar) instead of a full-screen overlay.
  // Content-fit (no fixed height) so the card grows with its content and the
  // page scrolls — same as the pending-review page and other detail pages.
  if (openModal) {
    return (
      <FormOffer
        fetchOffers={invalidateOffersList}
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-5 sm:px-6 dark:border-gray-800">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="min-w-0 shrink-0 lg:max-w-md">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Brands
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Total: {pagination.total.toLocaleString()} brands
                {pagination.totalPages > 1
                  ? ` · Page ${pagination.page} of ${pagination.totalPages}`
                  : ""}
              </p>
              <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                Add a new merchant line or filter the table below. Sync pulls
                the latest list from the feed.
              </p>
            </div>

            <div className="flex w-full min-w-0 flex-col lg:w-auto lg:shrink-0">
              {/* Actions consolidated into one primary-styled dropdown. */}
              <div className="relative inline-flex w-full sm:w-auto">
                <select
                  aria-label="Brand actions"
                  value=""
                  disabled={updateListMutation.isPending}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    e.currentTarget.value = "";
                    if (v === "create") router.push("/brands/create-brand");
                    else if (v === "sync") updateListMutation.mutate();
                  }}
                  className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 h-11 w-full cursor-pointer appearance-none rounded-lg px-4 pr-10 text-center text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed sm:w-auto"
                >
                  <option value="" disabled hidden>
                    {updateListMutation.isPending ? "Syncing…" : "New Brand"}
                  </option>
                  <option value="create" className="bg-white text-gray-800">
                    Create brand
                  </option>
                  <option value="sync" className="bg-white text-gray-800">
                    Sync brand list
                  </option>
                </select>
                <svg
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchBar
              id="brands-toolbar-search"
              type="search"
              autoComplete="off"
              placeholder="Search name, partner, or offer ID…"
              value={query.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-[300px] max-w-full"
            />
            <SortByDropdown
              id="brands-toolbar-country"
              value={query.country ?? ""}
              onChange={(e) =>
                setQuery((q) => ({ ...q, country: e.target.value, page: 1 }))
              }
            >
              <option value="">All countries</option>
              {OFFERS_COUNTRY_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SortByDropdown>
            <SortByDropdown
              aria-label="View mode"
              title="Group country variants of the same brand under one expandable row"
              value={viewMode}
              onChange={(e) =>
                setViewMode(e.target.value === "grouped" ? "grouped" : "flat")
              }
            >
              <option value="flat">Flat view</option>
              <option value="grouped">Grouped by brand</option>
            </SortByDropdown>
          </div>
          {/* Grouped view: brand count + expand/collapse all (only when grouped). */}
          {viewMode === "grouped" && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className="text-gray-500 dark:text-gray-400"
                title="Variants are grouped within the current page; a brand whose variants span pages may appear on more than one page."
              >
                {brandGroups.length} brand
                {brandGroups.length === 1 ? "" : "s"} · {offers.length} variant
                {offers.length === 1 ? "" : "s"} on this page
              </span>
              <button
                type="button"
                onClick={expandAllBrands}
                className="rounded border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={collapseAllBrands}
                className="rounded border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 dark:bg-white/[0.02]">
        {listErrorMessage ? (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {listErrorMessage}
            <button
              type="button"
              onClick={() =>
                queryClient.resetQueries({ queryKey: listQueryKey })
              }
              className="ml-2 text-red-800 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        ) : null}

        {offersLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="border-t-brand-500 dark:border-t-brand-400 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Loading brands...
            </span>
          </div>
        )}

        {!offersLoading && (
          <>
            {/* Brands table — hidden when no results match the filters; NoData shows instead. */}
            {offers.length > 0 && (
              <div className="-mx-4 w-full overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[920px] divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Offer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Max %
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Max Cap
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Availability / country
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {offers.map((offer, index) => {
                      const logoDesktopSrc = pathImage(resolveAdminOfferLogoPath(offer));
                      const availability = getOfferAvailabilityDisplay(offer);
                      const has = (s: string) =>
                        typeof s === "string" && s.length > 0;
                      const rowNumber =
                        (pagination.page - 1) * pagination.limit + index + 1;
                      // In grouped mode, emit a brand header before the FIRST variant of each brand,
                      // and hide subsequent variants when the brand is collapsed.
                      const groupKey = brandGroupKey(offer);
                      const group = brandGroups.find((g) => g.key === groupKey);
                      const isFirstOfGroup =
                        viewMode === "grouped" &&
                        group !== undefined &&
                        group.variants[0]?._id === offer._id;
                      const isExpanded = expandedBrandKeys.has(groupKey);
                      // Collapsed brand groups show only their header row; expanding reveals every variant.
                      const hideVariantRow =
                        viewMode === "grouped" && !isExpanded;
                      return (
                        <React.Fragment key={offer._id}>
                          {isFirstOfGroup && group ? (
                            <tr
                              key={`brand-header-${group.key}`}
                              className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-800"
                            >
                              <td colSpan={7} className="px-4 py-3 sm:px-6">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBrandExpand(group.key);
                                  }}
                                  className="flex w-full items-center justify-between gap-3 text-left"
                                >
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span
                                      aria-hidden
                                      className="inline-block w-4 text-gray-500 dark:text-gray-400"
                                    >
                                      {isExpanded ? "▾" : "▸"}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                      {group.name}
                                    </span>
                                    {group.isAnyGlobal && (
                                      <span
                                        className="bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                                        title={`Visible worldwide; default/fallback: ${group.globalFallbackCountry ?? "Not configured"}`}
                                      >
                                        Global
                                      </span>
                                    )}
                                    {group.isAnyGlobal && (
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                        Default/fallback:{" "}
                                        {group.globalFallbackCountry ??
                                          "Not configured"}
                                      </span>
                                    )}
                                    {group.availabilityClarification ? (
                                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                        {group.availabilityClarification}
                                      </span>
                                    ) : null}
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {group.variants.length}{" "}
                                      {group.variants.length === 1
                                        ? "country"
                                        : "countries"}
                                    </span>
                                  </span>
                                  <span className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    {group.variants.map((v) => {
                                      const list = (v.countries || "")
                                        .split(",")
                                        .map((c) => c.trim())
                                        .filter(Boolean);
                                      return list.map((c) => (
                                        <span
                                          key={`${v._id}-${c}`}
                                          className="rounded border border-gray-200 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900"
                                        >
                                          {c}
                                        </span>
                                      ));
                                    })}
                                  </span>
                                </button>
                              </td>
                            </tr>
                          ) : null}
                          {hideVariantRow ? null : (
                            <tr
                              className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                viewMode === "grouped"
                                  ? "bg-white dark:bg-gray-900/40"
                                  : ""
                              }`}
                              onClick={() => {
                                openEditOfferModal(offer);
                              }}
                            >
                              {/* No. */}
                              <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                                {rowNumber}
                              </td>
                              {/* Logo / Offer name / Category */}
                              <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
                                    {has(logoDesktopSrc) ? (
                                      <RemoteOrBlobImage
                                        className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                        src={logoDesktopSrc}
                                        alt={offer.offer_name}
                                        width={48}
                                        height={48}
                                        sizes={OFFER_THUMB_SIZES}
                                      />
                                    ) : (
                                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 sm:h-12 sm:w-12 dark:bg-gray-600 dark:text-gray-400">
                                        —
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {offer.offer_name_display ||
                                          offer.offer_name}
                                      </span>
                                      {availability.isGlobal && (
                                        <span
                                          className="bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                                          title={`Visible to customers in every country (default/fallback: ${availability.fallbackCountry})`}
                                        >
                                          Global
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {offer.categories || "Uncategorized"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {/* Status */}
                              <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                                <div className="flex flex-col items-start gap-1">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                      offer.disabled
                                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    }`}
                                  >
                                    {offerVisibilityStatusLabel(offer.disabled)}
                                  </span>
                                  {isUpsizeActiveNow(offer, nowMs) && (
                                    <span
                                      className="bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                                      title="Upsize event is live right now"
                                    >
                                      Upsize
                                    </span>
                                  )}
                                </div>
                              </td>
                              {/* Max Commission (% after 30% fee) */}
                              <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900 sm:px-6 sm:py-4 dark:text-gray-100">
                                {offer.commission_store != null
                                  ? `${offer.commission_store}%`
                                  : "—"}
                              </td>
                              {/* Max cap + Currency */}
                              <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {offer.max_cap != null
                                    ? offer.max_cap.toLocaleString()
                                    : "—"}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {offer.currency || "—"}
                                </div>
                              </td>
                              {/* Country */}
                              <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                                <div className="max-w-[140px] text-sm break-words text-gray-900 dark:text-gray-100">
                                  {availability.configuredCountry}
                                </div>
                                <div className="mt-0.5 max-w-[180px] text-xs text-gray-500 dark:text-gray-400">
                                  {availability.tableContextLabel}
                                </div>
                                {availability.clarification ? (
                                  <div className="mt-1 max-w-[180px] text-xs font-medium text-amber-700 dark:text-amber-300">
                                    {availability.clarification}
                                  </div>
                                ) : null}
                              </td>
                              <td className="relative px-4 py-3 text-sm font-medium whitespace-nowrap sm:px-6 sm:py-4">
                                <div
                                  ref={
                                    openActionsId === offer._id
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
                                        id === offer._id ? null : offer._id,
                                      );
                                    }}
                                    className={`${SUPPORT_BUTTON_CLASS} gap-1`}
                                    aria-expanded={openActionsId === offer._id}
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
                                  {openActionsId === offer._id && (
                                    <div
                                      className="absolute top-full right-auto left-0 z-50 mt-1 max-w-[min(18rem,calc(100vw-1.5rem))] min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:right-0 sm:left-auto sm:max-w-none dark:border-gray-600 dark:bg-gray-800"
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
                                          router.push(`/brands/${offer._id}`);
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
                                          const q = encodeURIComponent(
                                            offer.offer_name ||
                                              String(
                                                offer.offer_id ?? offer._id,
                                              ),
                                          );
                                          router.push(
                                            `/conversion?search=${q}`,
                                          );
                                          setOpenActionsId(null);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                      >
                                        View conversions
                                      </button>
                                      <a
                                        href={appLinks.offer(offer._id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        role="menuitem"
                                        onClick={() => setOpenActionsId(null)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                      >
                                        Open in App ↗
                                      </a>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDeleteConfirm(offer);
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
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
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
                      for (
                        let i = Math.max(2, current - 1);
                        i <= Math.min(total - 1, current + 1);
                        i++
                      ) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      if (current < total - 2) pages.push("ellipsis");
                      if (total > 1) pages.push(total);
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
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!hasNextPage}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {offers.length === 0 && !offersLoading && (
              <NoData>No brands found</NoData>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        busy={deleteOfferMutation.isPending}
        confirmLabel="Permanently delete"
        description="This permanently removes the brand from the admin list and customer app. This cannot be undone. Historical conversions are kept."
        isOpen={deleteConfirmOpen}
        onCancel={() => {
          if (!deleteOfferMutation.isPending) {
            setDeleteConfirmOpen(false);
            setOfferToDelete(null);
          }
        }}
        onConfirm={() => {
          void handleConfirmDeleteOffer();
        }}
        title={
          offerToDelete
            ? `Delete “${offerToDelete.name}”?`
            : "Delete this offer?"
        }
        tone="danger"
      />
    </div>
  );
}
