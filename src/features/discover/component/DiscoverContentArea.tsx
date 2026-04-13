"use client";

import CardShopMobileDefault from "@/components/common/card/CardShopMobileDefault";
import CardSpecial from "@/components/common/card/CardSpecial";
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import type { DiscoverFilters, DiscoverSort } from "@/features/discover/types";
import { discoverCategoryApiQuery, discoverCategoryDisplayLabel } from "@/features/discover/types";
import type { DataOffer, IResponseOffer } from "@/interfaces/offer";
import { trackMerchantSelect } from "@/lib/analytics";
import { fetcher } from "@/lib/axios/client";
import { getOfferBannerSrc, getOfferCashbackPercentLabel } from "@/lib/offer/offerCardVisuals";
import { offerHasGrabCouponBadge } from "@/lib/offer/offerGrabCouponBadge";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useBreakpointMdUp } from "@/hooks/useBreakpointMdUp";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

const SORT_SEQUENCE: DiscoverSort[] = ["popular", "newest", "highCashback"];

export interface DiscoverContentAreaProps {
  filters: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}

const discoverBrandsGrid =
  "grid w-full grid-cols-2 gap-2 sm:gap-5 md:grid-cols-3 md:gap-6";

export function DiscoverContentArea({ filters, onChange }: DiscoverContentAreaProps) {
  const t = useTranslations();
  const locale = useLocale();
  const lg = useBreakpointMdUp();
  const apiCategory = discoverCategoryApiQuery(filters.category);
  const categoryLabel = discoverCategoryDisplayLabel(filters.category, locale);

  const { data, isPending, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["discoverFeed", apiCategory],
    queryFn: async ({ pageParam }) =>
      fetcher(
        `/offer?category=${encodeURIComponent(apiCategory)}&search=${encodeURIComponent("")}&limit=24&page=${pageParam}`
      ) as Promise<IResponseOffer>,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const allOffers = useMemo(() => {
    const flat = data?.pages.flatMap((p) => p.data) ?? [];
    const filtered = flat.filter((o) => (o.commission_store ?? 0) >= filters.minCashback);
    if (filters.sort === "newest") {
      return [...filtered].sort(
        (a, b) =>
          new Date(b.datetime_created).getTime() - new Date(a.datetime_created).getTime()
      );
    }
    if (filters.sort === "highCashback") {
      return [...filtered].sort(
        (a, b) => (b.commission_store ?? 0) - (a.commission_store ?? 0)
      );
    }
    return filtered;
  }, [data, filters.sort, filters.minCashback]);

  const listId = `discover_${filters.category || "all"}`;
  const listName = `Discover – ${categoryLabel || t("discoverCategoryAll")}`;

  const sortLabel = (s: DiscoverSort) => {
    if (s === "popular") return t("discoverSortPopular");
    if (s === "newest") return t("discoverSortNewest");
    return t("discoverSortHighCashback");
  };

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
    <div className="min-w-0 flex-1">
      <div className="gc-surface-card sticky top-[80px] z-20 flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="mr-1 text-sm font-medium text-[var(--gc-text-muted)]">{t("discoverSortBy")}</span>
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
        <span className="ml-auto text-sm text-[var(--gc-text-soft)]">
          {allOffers.length} {t("discoverResultsCount")}
        </span>
      </div>

      {isPending ? (
        <div className={cn("mt-6 pb-1 pt-0.5", discoverBrandsGrid)}>
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="gc-surface-card box-border flex h-[22rem] min-h-[20rem] w-full min-w-0 animate-pulse justify-self-center sm:h-80 md:max-w-[280px]"
            />
          ))}
        </div>
      ) : allOffers.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--gc-text-muted)]" role="status">
          {t("discoverEmpty")}
        </p>
      ) : (
        <>
          <MerchantListTracker items={allOffers} listId={listId} listName={listName} source="discover_page" />
          <div className={cn("mt-6 pb-1 pt-0.5", discoverBrandsGrid)}>
            {allOffers.map((offer, index) => {
              const bannerSrc = getOfferBannerSrc(offer, lg);
              const percentStr = getOfferCashbackPercentLabel(offer);
              const showGrabCoupon = offerHasGrabCouponBadge(offer);
              const offerTitle = offer.offer_name_display || offer.offer_name || t("shop");
              return (
                <div
                  key={offer._id}
                  className={cn(
                    "box-border flex h-auto w-full min-w-0",
                    lg ? "max-w-[280px] justify-center justify-self-center" : "justify-center"
                  )}
                >
                  <div className="relative w-full min-w-0 max-w-[280px]">
                    <Link
                      href={`/shop/${offer._id}`}
                      className="absolute inset-0 z-0"
                      aria-label={t("discoverOpenShopAria", { name: offerTitle })}
                      onClick={() => trackSelect(offer, index)}
                    />
                    <div className="pointer-events-none relative z-[1] w-full min-w-0">
                      {lg ? (
                        <CardSpecial
                          banner={bannerSrc}
                          offer_name={offerTitle}
                          percent={percentStr}
                          categories={offer.categories}
                          showGrabCoupon={showGrabCoupon}
                        />
                      ) : (
                        <CardShopMobileDefault
                          banner={bannerSrc}
                          offer_name={offerTitle}
                          percent={percentStr}
                          categories={offer.categories}
                          showGrabCoupon={showGrabCoupon}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {hasNextPage ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            className="rounded-full border border-[var(--gc-primary-strong)] px-8 py-2.5 text-sm font-semibold text-[var(--gc-primary-strong)] transition-colors hover:bg-[var(--gc-primary-soft)] disabled:opacity-50"
          >
            {isFetchingNextPage ? t("discoverLoadingMore") : t("discoverLoadMore")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
