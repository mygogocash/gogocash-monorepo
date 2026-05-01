"use client";

import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import { DiscoverProductCard } from "@/features/discover/component/DiscoverProductCard";
import { DiscoverProductTermsDialog } from "@/features/discover/component/DiscoverProductTermsDialog";
import SearchIcon from "@/components/icons/SearchIcon";
import type { DiscoverFilters, DiscoverSort } from "@/features/discover/types";
import { discoverCategoryApiQuery, discoverCategoryDisplayLabel } from "@/features/discover/types";
import type { DataOffer, IResponseOffer } from "@/interfaces/offer";
import { trackMerchantSelect } from "@/lib/analytics";
import { fetcher } from "@/lib/axios/client";
import {
  getDiscoverListingPricing,
  getDiscoverProductOutboundUrl,
  getOfferBannerSrc,
} from "@/lib/offer/offerCardVisuals";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useBreakpointMdUp } from "@/hooks/useBreakpointMdUp";
import { useUserCountry } from "@/hooks/useUserCountry";
import { filterOffersByCountry } from "@/lib/offer/offerVisibility";
import Pagination from "@mui/material/Pagination";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

const SEARCH_DEBOUNCE_MS = 320;
const DISCOVER_PAGE_SIZE = 60;

const SORT_SEQUENCE: DiscoverSort[] = ["popular", "newest", "highCashback"];

export interface DiscoverContentAreaProps {
  filters: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}

const discoverBrandsGrid =
  "grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5 xl:gap-6";

type DiscoverProductFeedProps = {
  filters: DiscoverFilters;
  apiCategory: string;
  locale: string;
  lg: boolean;
  listId: string;
  listName: string;
  discoverBrandsGrid: string;
};

function DiscoverProductFeed({
  filters,
  apiCategory,
  locale,
  lg,
  listId,
  listName,
  discoverBrandsGrid,
}: DiscoverProductFeedProps) {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [termsOpen, setTermsOpen] = useState(false);
  const openTerms = useCallback(() => setTermsOpen(true), []);
  const closeTerms = useCallback(() => setTermsOpen(false), []);
  const gridAnchorRef = useRef<HTMLDivElement>(null);
  const { country: userCountry } = useUserCountry();

  const { data, isPending, isFetching } = useQuery({
    queryKey: ["discoverFeed", apiCategory, filters.search, page, DISCOVER_PAGE_SIZE],
    queryFn: () =>
      fetcher(
        `/offer?category=${encodeURIComponent(apiCategory)}&search=${encodeURIComponent(filters.search)}&limit=${DISCOVER_PAGE_SIZE}&page=${page}`
      ) as Promise<IResponseOffer>,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const safePage = Math.min(page, totalPages);

  const allOffers = useMemo(() => {
    const flat = data?.data ?? [];
    // Visibility: country-specific brands only shown to matching customers; global brands shown to everyone.
    const visible = filterOffersByCountry(flat, userCountry);
    const filtered = visible.filter((o) => (o.commission_store ?? 0) >= filters.minCashback);
    if (filters.sort === "newest") {
      return [...filtered].sort(
        (a, b) => new Date(b.datetime_created).getTime() - new Date(a.datetime_created).getTime()
      );
    }
    if (filters.sort === "highCashback") {
      return [...filtered].sort((a, b) => (b.commission_store ?? 0) - (a.commission_store ?? 0));
    }
    return filtered;
  }, [data, filters.sort, filters.minCashback, userCountry]);

  const trackSelect = (offer: DataOffer, index: number) => {
    trackMerchantSelect({
      merchant: offer,
      listId,
      listName,
      position: index + 1,
      source: "discover_page",
    });
  };

  return (
    <>
      <div ref={gridAnchorRef} className="scroll-mt-28" aria-hidden />

      {isPending ? (
        <div className={cn("mt-6 pb-1 pt-0.5", discoverBrandsGrid)}>
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="box-border flex w-full min-w-0 flex-col gap-2.5 overflow-hidden rounded-2xl border border-[var(--gc-border)] bg-[var(--gc-surface)] p-3 shadow-[var(--gc-shadow)]"
            >
              <div className="aspect-square w-full animate-pulse rounded-xl bg-[var(--gc-primary-soft)]" />
              <div className="flex flex-col gap-2">
                <div className="h-4 w-20 animate-pulse rounded-full bg-[var(--gc-primary-soft)]" />
                <div className="h-4 w-full animate-pulse rounded bg-[var(--gc-border)]" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--gc-border)]" />
                <div className="mt-auto flex flex-col gap-2 border-t border-[var(--gc-border)] pt-2.5">
                  <div className="flex justify-between gap-2">
                    <div className="h-3 w-12 animate-pulse rounded bg-[var(--gc-border)]" />
                    <div className="h-5 w-16 animate-pulse rounded bg-[var(--gc-primary-soft)]" />
                  </div>
                  <div className="h-10 w-full animate-pulse rounded-full bg-[var(--gc-primary-soft)]" />
                  <div className="mx-auto h-3 w-28 animate-pulse rounded bg-[var(--gc-border)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : allOffers.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--gc-text-muted)]" role="status">
          {t("discoverEmpty")}
        </p>
      ) : (
        <>
          <MerchantListTracker
            items={allOffers}
            listId={listId}
            listName={listName}
            source="discover_page"
          />
          <div className={cn("gc-stagger mt-6 pb-1 pt-0.5", discoverBrandsGrid)}>
            {allOffers.map((offer, index) => {
              const bannerSrc = getOfferBannerSrc(offer, lg);
              const pricing = getDiscoverListingPricing(offer, locale);
              const outbound = getDiscoverProductOutboundUrl(offer);
              const shopNow = outbound
                ? ({ kind: "external", href: outbound } as const)
                : ({ kind: "internal", href: `/shop/${offer._id}` } as const);
              const offerTitle = offer.offer_name_display || offer.offer_name || t("shop");
              const listPosition = (safePage - 1) * DISCOVER_PAGE_SIZE + index + 1;
              return (
                <div key={offer._id} className="gc-fade-up box-border flex h-auto w-full min-w-0">
                  <div className="gc-hover-lift relative w-full min-w-0">
                    <Link
                      href={`/shop/${offer._id}`}
                      className="absolute inset-0 z-0"
                      aria-label={t("discoverOpenShopAria", { name: offerTitle })}
                      onClick={() => trackSelect(offer, listPosition - 1)}
                    />
                    <div className="pointer-events-none relative z-[1] w-full min-w-0">
                      <DiscoverProductCard
                        banner={bannerSrc}
                        offer_name={offerTitle}
                        priceLabel={pricing.priceLabel}
                        originalPriceLabel={pricing.originalPriceLabel}
                        discountPercent={pricing.discountPercent}
                        shopNow={shopNow}
                        onShopNowNavigate={() => trackSelect(offer, listPosition - 1)}
                        onOpenTerms={openTerms}
                        isDesktop={lg}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!isPending && data && data.total > 0 && totalPages >= 1 ? (
        <div className="mt-8 flex justify-center">
          <Pagination
            count={totalPages}
            page={safePage}
            disabled={isFetching}
            variant="outlined"
            shape="rounded"
            siblingCount={1}
            boundaryCount={1}
            showFirstButton
            showLastButton
            onChange={(_event: ChangeEvent<unknown>, value: number) => {
              setPage(value);
              requestAnimationFrame(() => {
                gridAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              });
            }}
            sx={{
              "& .MuiPaginationItem-root": {
                minWidth: 32,
                height: 32,
                borderRadius: "8px",
                borderColor: "#e4e4e4",
              },
              "& .Mui-selected": {
                backgroundColor: "#00cc99 !important",
                color: "#ffffff !important",
                borderColor: "#00cc99 !important",
              },
            }}
          />
        </div>
      ) : null}

      <DiscoverProductTermsDialog open={termsOpen} onClose={closeTerms} />
    </>
  );
}

function DiscoverResultsCount({
  apiCategory,
  filters,
}: {
  apiCategory: string;
  filters: DiscoverFilters;
}) {
  const t = useTranslations();
  const { data, isPending } = useQuery({
    queryKey: ["discoverFeed", apiCategory, filters.search, 1, DISCOVER_PAGE_SIZE],
    queryFn: () =>
      fetcher(
        `/offer?category=${encodeURIComponent(apiCategory)}&search=${encodeURIComponent(filters.search)}&limit=${DISCOVER_PAGE_SIZE}&page=1`
      ) as Promise<IResponseOffer>,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <span className="ml-auto text-sm text-[var(--gc-text-soft)]">
      {isPending ? "—" : (data?.total ?? 0)} {t("discoverResultsCount")}
    </span>
  );
}

export function DiscoverContentArea({ filters, onChange }: DiscoverContentAreaProps) {
  const t = useTranslations();
  const locale = useLocale();
  const lg = useBreakpointMdUp();
  const apiCategory = discoverCategoryApiQuery(filters.category);
  const categoryLabel = discoverCategoryDisplayLabel(filters.category, locale);
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [searchDraft, setSearchDraft] = useState(filters.search);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = searchDraft.trim();
      if (next !== filtersRef.current.search) {
        onChange({ ...filtersRef.current, search: next });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchDraft, onChange]);

  const listId = `discover_${filters.category || "all"}${filters.search ? "_q" : ""}`;
  const listName = `Discover – ${categoryLabel || t("discoverCategoryAll")}`;

  const sortLabel = (s: DiscoverSort) => {
    if (s === "popular") return t("discoverSortPopular");
    if (s === "newest") return t("discoverSortNewest");
    return t("discoverSortHighCashback");
  };

  const feedResetKey = `${apiCategory}|${filters.search}|${filters.sort}|${filters.minCashback}`;

  return (
    <div className="min-w-0 flex-1">
      <div className="gc-surface-card flex flex-col gap-3 px-4 py-3">
        <div className="relative w-full min-w-0">
          <SearchIcon
            width="18"
            height="18"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gc-text-muted)]"
            fill="currentColor"
            aria-hidden
          />
          <input
            type="search"
            enterKeyHint="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={t("discoverSearchPlaceholder")}
            aria-label={t("discoverSearchLabel")}
            className={cn(
              "w-full min-w-0 rounded-full border border-[var(--gc-border)] bg-[var(--gc-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--gc-text)] shadow-sm",
              "placeholder:text-[var(--gc-text-soft)]",
              "focus-visible:border-[var(--gc-primary-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gc-primary-strong)]"
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium text-[var(--gc-text-muted)]">
            {t("discoverSortBy")}
          </span>
          {SORT_SEQUENCE.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...filters, sort: s })}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gc-primary-strong)]",
                filters.sort === s
                  ? "border-[var(--gc-primary-strong)] bg-[var(--gc-primary-strong)] text-white"
                  : "border-[var(--gc-border)] bg-[var(--gc-surface)] text-[var(--gc-text)] hover:border-[var(--gc-primary-strong)] hover:text-[var(--gc-primary-strong)]"
              )}
            >
              {sortLabel(s)}
            </button>
          ))}
          <DiscoverResultsCount apiCategory={apiCategory} filters={filters} />
        </div>
      </div>

      <DiscoverProductFeed
        key={feedResetKey}
        filters={filters}
        apiCategory={apiCategory}
        locale={locale}
        lg={lg}
        listId={listId}
        listName={listName}
        discoverBrandsGrid={discoverBrandsGrid}
      />
    </div>
  );
}
