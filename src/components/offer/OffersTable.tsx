"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { appLinks } from "@/lib/appLinks";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";
import {
  fetchOffersList,
  offersListQueryKey,
} from "@/lib/query/offersQueries";
import {
  Offer,
  OfferRequestForm,
  OffersQuery,
  normalizeOfferDisplayTags,
  normalizeOfferProductTypes,
} from "@/types/api";
import { resolveDeeplinkStoreId } from "@/data/deeplinkStores";
import {
  affiliateNetworkName,
  resolveAffiliateNetworkIdForOffer,
} from "@/data/affiliateNetworks";
import { pathImage } from "@/utils/helper";
import { devError } from "@/lib/devConsole";
import { useDataSession } from "@/hooks/useDataSession";
import Link from "next/link";
import FormOffer from "./FormOffer";
import { useRouter } from "next/navigation";
import Select from "../form/Select";
import { OFFER_THUMB_SIZES } from "./offerMedia";

const OFFERS_COUNTRY_FILTER_OPTIONS = [
  { label: "\uD83C\uDDF9\uD83C\uDDED Thailand", value: "Thailand" },
  { label: "\uD83C\uDDEE\uD83C\uDDE9 Indonesia", value: "Indonesia" },
  { label: "\uD83C\uDDFB\uD83C\uDDF3 Vietnam", value: "Vietnam" },
  { label: "\uD83C\uDDF5\uD83C\uDDED Philippines", value: "Philippines" },
  { label: "\uD83C\uDDEE\uD83C\uDDF3 India", value: "India" },
  { label: "\uD83C\uDDF2\uD83C\uDDFE Malaysia", value: "Malaysia" },
  { label: "\uD83C\uDDE7\uD83C\uDDF7 Brazil", value: "Brazil" },
  {
    label: "\uD83C\uDDFA\uD83C\uDDF8 United States of America",
    value: "United States of America",
  },
  { label: "\uD83C\uDDEC\uD83C\uDDE7 United Kingdom", value: "United Kingdom" },
  { label: "\uD83C\uDDF8\uD83C\uDDEC Singapore", value: "Singapore" },
  { label: "\uD83C\uDDF2\uD83C\uDDF2 Myanmar", value: "Myanmar" },
];

function displayAffiliatePartner(offer: Offer): string {
  const raw = offer.affiliate_partner?.trim();
  if (raw) return raw;
  return affiliateNetworkName(resolveAffiliateNetworkIdForOffer(offer));
}

/**
 * Brand-grouping key — same logic as the customer-side `dedupeOffersByBrand`.
 * `merchant_id` is the strongest grouping signal (one merchant id across markets); falls
 * back to `lookup_value` with the country suffix stripped (e.g. `apple_th` → `apple`).
 */
function brandGroupKey(offer: Offer): string {
  if (offer.merchant_id && offer.merchant_id > 0) return `mid:${offer.merchant_id}`;
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
  return name
    .replace(/\s*[-–—]\s*(TH|SG|ID|MY|PH|VN|US|UK|GB)\b.*$/i, "")
    .replace(/\s*\((TH|SG|ID|MY|PH|VN|US|UK|GB)\)\s*$/i, "")
    .trim() || name;
}

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
    commission_entry_mode: "manual",
    banner_mobile: null,
    extra_store: offer.extra_store || false,
    upsize_start_date: offer.upsize_start_date ?? null,
    upsize_end_date: offer.upsize_end_date ?? null,
    upsize_special_commission: offer.upsize_special_commission ?? null,
    upsize_max_cap: offer.upsize_max_cap ?? null,
    upsize_product_types: normalizeOfferProductTypes(offer.upsize_product_types),
    product_types: normalizeOfferProductTypes(offer.product_types),
    all_product_types: offer.all_product_types ?? false,
    admin_commission_info: offer.admin_commission_info ?? [],
    policy_category_id: offer.policy_category_id ?? "",
    custom_terms: offer.custom_terms ?? "",
    note_to_user: offer.note_to_user ?? "",
    affiliate_network_id: resolveAffiliateNetworkIdForOffer(offer),
    deeplink_store_id: resolveDeeplinkStoreId(offer),
    offer_display_tags: normalizeOfferDisplayTags(offer.offer_display_tags),
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
    commission_entry_mode: "manual",
    id: "",
    banner_mobile: null,
    extra_store: false,
    upsize_start_date: null,
    upsize_end_date: null,
    upsize_special_commission: null,
    upsize_max_cap: null,
    upsize_product_types: [],
    product_types: [],
    all_product_types: false,
    admin_commission_info: [],
    policy_category_id: "",
    custom_terms: "",
    note_to_user: "",
    affiliate_network_id: "involve_asia",
    deeplink_store_id: "global",
    offer_display_tags: normalizeOfferDisplayTags(undefined),
  });
  const session = useDataSession();
  const queryClient = useQueryClient();
  const token = session.accessToken ?? DEFAULT_MOCK_ACCESS_TOKEN;

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

  const offers = offersResponse?.data ?? [];

  /**
   * View mode: "flat" lists every offer row independently (current behavior); "grouped" buckets
   * country variants of the same brand under a collapsible parent row so admins see "Apple" once
   * with a TH · SG · ID summary instead of three unrelated rows.
   */
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat");
  const [expandedBrandKeys, setExpandedBrandKeys] = useState<Set<string>>(new Set());

  const brandGroups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; variants: Offer[]; isAnyGlobal: boolean }>();
    const order: string[] = [];
    for (const o of offers) {
      const key = brandGroupKey(o);
      if (!map.has(key)) {
        map.set(key, { key, name: brandGroupDisplayName(o), variants: [], isAnyGlobal: false });
        order.push(key);
      }
      const g = map.get(key)!;
      g.variants.push(o);
      if (o.is_global) g.isAnyGlobal = true;
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

  const expandAllBrands = () => setExpandedBrandKeys(new Set(brandGroups.map((g) => g.key)));
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
    mutationFn: (offerId: string) => apiClient.deleteOffer(offerId, token),
    onSuccess: invalidateOffersList,
    onError: (err) => devError("Failed to delete offer:", err),
  });

  const updateListMutation = useMutation({
    mutationFn: () => apiClient.updateListOffer(token),
    onSuccess: invalidateOffersList,
    onError: (err) => devError("Failed to update offer list:", err),
  });

  const listErrorMessage =
    offersError instanceof Error ? offersError.message : offersError ? String(offersError) : null;

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

  const handleSearch = (searchValue: string) => {
    setQuery((q) => ({ ...q, search: searchValue, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery((q) => ({ ...q, page: newPage }));
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      await deleteOfferMutation.mutateAsync(offerId);
    } catch {
      /* toast via devError in mutation */
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
        fetchOffers={invalidateOffersList}
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />

      <div className="border-b border-gray-100 px-4 py-5 sm:px-6 dark:border-gray-800">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="min-w-0 shrink-0 lg:max-w-md">
              <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                Brands
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">
                  {pagination.total.toLocaleString()}
                </span>{" "}
                brands
                {pagination.totalPages > 1 ? (
                  <span className="text-gray-500 dark:text-gray-500">
                    {" "}
                    · Page {pagination.page} of {pagination.totalPages}
                  </span>
                ) : null}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                Add a new merchant line or filter the table below. Sync pulls the latest list from the feed.
              </p>
            </div>

            <div className="flex w-full min-w-0 flex-col lg:w-auto lg:shrink-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Actions
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                <Link
                  href="/brands/create-brand"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500"
                >
                  Create brand
                </Link>
                <button
                  type="button"
                  onClick={() => updateListMutation.mutate()}
                  disabled={updateListMutation.isPending}
                  title="Re-fetch brands from the affiliate feed and refresh this list"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 shadow-theme-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80"
                >
                  {updateListMutation.isPending ? "Syncing…" : "Sync brand list"}
                </button>
              </div>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50/90 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-900/50">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Find brands
            </p>
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label
                  htmlFor="brands-toolbar-search"
                  className="text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  Search
                </label>
                <input
                  id="brands-toolbar-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Name, partner, or offer ID…"
                  value={query.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-700 dark:focus:ring-brand-400/20"
                />
              </div>
              <div className="flex min-w-0 w-full flex-col gap-1.5">
                <label
                  htmlFor="brands-toolbar-country"
                  className="text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  Country
                </label>
                <Select
                  id="brands-toolbar-country"
                  className="w-full min-w-0"
                  options={OFFERS_COUNTRY_FILTER_OPTIONS}
                  placeholder="All countries"
                  placeholderDisabled={false}
                  defaultValue={query.country ?? ""}
                  onChange={(value) => {
                    setQuery((q) => ({ ...q, country: value, page: 1 }));
                  }}
                />
              </div>
            </div>
            {/* View mode: flat (one row per offer) vs grouped (one row per brand, expandable per country variant). */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">View</span>
                <div className="inline-flex rounded-lg border border-gray-300 bg-white text-xs dark:border-gray-600 dark:bg-gray-900">
                  <button
                    type="button"
                    onClick={() => setViewMode("flat")}
                    className={`rounded-l-lg px-3 py-1.5 transition-colors ${
                      viewMode === "flat"
                        ? "bg-brand-500 text-white"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grouped")}
                    className={`rounded-r-lg px-3 py-1.5 transition-colors ${
                      viewMode === "grouped"
                        ? "bg-brand-500 text-white"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                    title="Group country variants of the same brand under one expandable row"
                  >
                    Grouped by brand
                  </button>
                </div>
              </div>
              {viewMode === "grouped" && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {brandGroups.length} brand{brandGroups.length === 1 ? "" : "s"} · {offers.length} variant{offers.length === 1 ? "" : "s"}
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
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 dark:bg-white/[0.02]">
        {listErrorMessage ? (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {listErrorMessage}
            <button
              type="button"
              onClick={() => queryClient.resetQueries({ queryKey: listQueryKey })}
              className="ml-2 text-red-800 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        ) : null}

        {offersLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading brands...</span>
          </div>
        )}

        {!offersLoading && (
          <>
            {/* Brands table */}
            <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[920px] divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Offer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Affiliate partner
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
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400 sm:px-6">
                      Active policy
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
                    const rowNumber = (pagination.page - 1) * pagination.limit + index + 1;
                    // In grouped mode, emit a brand header before the FIRST variant of each brand,
                    // and hide subsequent variants when the brand is collapsed.
                    const groupKey = brandGroupKey(offer);
                    const group = brandGroups.find((g) => g.key === groupKey);
                    const isFirstOfGroup =
                      viewMode === "grouped" && group !== undefined && group.variants[0]?._id === offer._id;
                    const isExpanded = expandedBrandKeys.has(groupKey);
                    // Collapsed brand groups show only their header row; expanding reveals every variant.
                    const hideVariantRow = viewMode === "grouped" && !isExpanded;
                    return (
                    <React.Fragment key={offer._id}>
                    {isFirstOfGroup && group ? (
                      <tr
                        key={`brand-header-${group.key}`}
                        className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-800"
                      >
                        <td colSpan={15} className="px-4 py-3 sm:px-6">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBrandExpand(group.key);
                            }}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <span className="flex items-center gap-2">
                              <span aria-hidden className="inline-block w-4 text-gray-500 dark:text-gray-400">
                                {isExpanded ? "▾" : "▸"}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {group.name}
                              </span>
                              {group.isAnyGlobal && (
                                <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                                  Global
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {group.variants.length} {group.variants.length === 1 ? "country" : "countries"}
                              </span>
                            </span>
                            <span className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              {group.variants.map((v) => {
                                const list = (v.countries || "").split(",").map((c) => c.trim()).filter(Boolean);
                                return list.map((c) => (
                                  <span key={`${v._id}-${c}`} className="rounded border border-gray-200 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900">
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
                        viewMode === "grouped" ? "bg-white dark:bg-gray-900/40" : ""
                      }`}
                      onClick={() => {
                        openEditOfferModal(offer);
                      }}
                    >
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                        {rowNumber}
                      </td>
                      <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {offer.offer_name}
                            </span>
                            {offer.is_global && (
                              <span
                                className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                                title={`Visible to customers in every country${offer.default_country ? ` (default: ${offer.default_country})` : ""}`}
                              >
                                Global
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            New Name:{" "}
                            {offer.offer_name_display
                              ? offer.offer_name_display
                              : "N/A"}
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
                        </div>
                      </td>

                      <td className="min-w-0 max-w-[160px] px-4 py-3 sm:px-6 sm:py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                          {displayAffiliatePartner(offer)}
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
                                sizes={OFFER_THUMB_SIZES}
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
                                sizes={OFFER_THUMB_SIZES}
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
                                sizes={OFFER_THUMB_SIZES}
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
                                sizes={OFFER_THUMB_SIZES}
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
                      <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                        <div className="max-w-[140px] text-sm text-gray-900 dark:text-gray-100 break-words">
                          {offer.countries
                            ? offer.countries.split(",").map((c) => c.trim()).filter(Boolean).join(", ")
                            : "—"}
                        </div>
                      </td>
                      <td className="min-w-0 max-w-[200px] px-4 py-3 sm:px-6 sm:py-4">
                        <div
                          className="text-sm text-gray-900 dark:text-gray-100 break-words line-clamp-2"
                          title={offer.description || undefined}
                        >
                          {offer.description
                            ? offer.description.length > 100
                              ? `${offer.description.slice(0, 100)}...`
                              : offer.description
                            : "—"}
                        </div>
                      </td>
                      <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
                          {offer.active_policy ?? offer.categories ?? "—"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 dark:text-gray-100">
                        {offer.max_cap != null ? offer.max_cap.toLocaleString() : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 dark:text-gray-100">
                        {offer.commission_store != null ? `${offer.commission_store}%` : "—"}
                      </td>
                      <td className="min-w-0 px-4 py-3 sm:px-6 sm:py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            offer.disabled
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}
                        >
                          {offer.disabled ? "Disable" : "Enable"}
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
                              className="absolute left-0 right-auto top-full z-50 mt-1 min-w-[10rem] max-w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 sm:left-auto sm:right-0 sm:max-w-none"
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
                                  const q = encodeURIComponent(offer.offer_name || String(offer.offer_id ?? offer._id));
                                  router.push(`/conversion?search=${q}`);
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
                    )}
                    </React.Fragment>
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

            {offers.length === 0 && !offersLoading && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No brands found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
