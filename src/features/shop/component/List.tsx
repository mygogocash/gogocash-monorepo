"use client";

import CardBrandLogo from "@/components/common/card/CardBrandLogo";
import SearchIcon from "@/components/icons/SearchIcon";
import { offerHasGrabCouponBadge } from "@/lib/offer/offerGrabCouponBadge";
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import { Link } from "@/i18n/navigation";
import { DataOffer, IResponseOffer } from "@/interfaces/offer";
import { IResponseCategory } from "@/interfaces/shop";
import { fetcher } from "@/lib/axios/client";
import { cn, getPercent } from "@/lib/utils";
import { trackMerchantSelect } from "@/lib/analytics";
import { getBrandTileTint, getOfferSquareLogoSrc } from "@/lib/offer/offerCardVisuals";
import ShopExploreCategoryAside from "@/features/shop/component/ShopExploreCategoryAside";
import { buildShopExploreCategoryMenu } from "@/features/shop/shopExploreCategoryMenu";
import { type ShopExploreSort, sortShopExploreOffers } from "@/features/shop/shopExploreSort";
import Pagination from "@mui/material/Pagination";
import { useBreakpointMdUp } from "@/hooks/useBreakpointMdUp";
import { useUserCountry } from "@/hooks/useUserCountry";
import { dedupeOffersByBrand } from "@/lib/offer/offerVisibility";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 320;

const SHOP_EXPLORE_SORT_PILLS: ShopExploreSort[] = [
  "popular",
  "newest",
  "highest_cashback",
  "lowest_cashback",
];

/**
 * Shopee-aligned shop tiers (Mall / Preferred / Normal). Until the Offer schema
 * exposes `shop_type`, the filter is a no-op for non-`all` selections — kept
 * here so UI is ready when the API ships (see Shopee CPS Sub ID 5: shop_type).
 */
type ShopType = "all" | "mall" | "preferred" | "normal";
const SHOP_TYPE_PILLS: ShopType[] = ["all", "mall", "preferred", "normal"];

/**
 * `brands` — All Brands directory at `/shop` (corporate brand entities).
 * `shops` — All Shops directory at `/shops` (Shopee-aligned merchant shops with shop-type filter + T+7 tracking notice).
 */
export type ShopListMode = "brands" | "shops";

interface ListProps {
  mode?: ShopListMode;
}

const List = ({ mode = "shops" }: ListProps) => {
  const t = useTranslations();
  const isShopsMode = mode === "shops";
  const lg = useBreakpointMdUp();
  const [sortBy, setSortBy] = useState<ShopExploreSort>("highest_cashback");
  const [shopType, setShopType] = useState<ShopType>("all");
  const [offerSearch, setOfferSearch] = useState({
    category: "",
    page: 1,
    limit: 24,
    search: "",
  });
  const offerSearchRef = useRef(offerSearch);
  useEffect(() => {
    offerSearchRef.current = offerSearch;
  }, [offerSearch]);

  const [searchDraft, setSearchDraft] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = searchDraft.trim();
      if (next !== offerSearchRef.current.search) {
        setOfferSearch((p) => ({ ...p, search: next, page: 1 }));
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchDraft]);

  const { data: categoryList } = useQuery<IResponseCategory[]>({
    queryKey: ["getCategory", "shop-explore"],
    queryFn: () => fetcher(`/offer/get-category/list`),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const categoryMenuRows = useMemo(
    () => buildShopExploreCategoryMenu(categoryList ?? []),
    [categoryList]
  );

  const { data: offers, isPending: offersPending } = useQuery<IResponseOffer>({
    queryKey: ["getTrending", offerSearch],
    queryFn: () =>
      fetcher(
        `/offer?category=${encodeURIComponent(offerSearch.category)}&search=${encodeURIComponent(offerSearch.search)}&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: Infinity,
    enabled: offerSearch.page > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { country: userCountry } = useUserCountry();
  const sortedOffers = useMemo(() => {
    if (!offers?.data?.length) return [];
    // Hide country-specific brands from users in other countries; global brands always show.
    const visible = dedupeOffersByBrand(offers.data, userCountry);
    return sortShopExploreOffers(visible, sortBy);
  }, [offers, sortBy, userCountry]);

  const percentLabel = (offer: DataOffer) => {
    const percent = getPercent(offer.commissions);
    return offer?.commission_store
      ? `${offer.commission_store.toFixed(1)}%`
      : percent
        ? `${percent}%`
        : "0%";
  };

  const sortPillLabel = (s: ShopExploreSort) => {
    if (s === "popular") return t("discoverSortPopular");
    if (s === "newest") return t("discoverSortNewest");
    if (s === "highest_cashback") return t("discoverSortHighCashback");
    return t("sortOption_lowest_cashback");
  };

  const shopTypeLabel = (s: ShopType) => {
    if (s === "all") return t("shopTypeAll");
    if (s === "mall") return t("shopTypeMall");
    if (s === "preferred") return t("shopTypePreferred");
    return t("shopTypeNormal");
  };

  return (
    <section id="explore-shop" className="gc-home-layout gc-page-block w-full scroll-mt-24 pb-10">
      <header className="mb-6 md:mb-8">
        <h1 className="gc-section-title">
          {isShopsMode ? t("shopExploreTitle") : t("brandsExploreTitle")}
          <span className="ml-2 inline-block align-middle text-[0.85em] font-extrabold" aria-hidden>
            {isShopsMode ? "🛍️" : "✨"}
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--gc-text-muted)]">
          {isShopsMode ? t("shopExploreSubtitle") : t("brandsExploreSubtitle")}
        </p>

        {/* T+7 tracking trust banner — Shopee-shops only */}
        {isShopsMode ? (
          <div
            role="note"
            className="mt-4 flex max-w-2xl items-start gap-2 rounded-2xl border border-(--gc-border) bg-(--gc-surface-muted) px-3 py-2 text-xs leading-relaxed text-[var(--gc-text-muted)]"
          >
            <span aria-hidden className="text-base leading-none">
              ⏱️
            </span>
            <p>{t("shopTrackingNotice")}</p>
          </div>
        ) : null}
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ShopExploreCategoryAside
          categoryMenuRows={categoryMenuRows}
          activeCategory={offerSearch.category}
          asideMode={{
            mode: "inPageFilter",
            onSelectCategory: (filterName) => {
              setOfferSearch((p) => ({ ...p, category: filterName, page: 1 }));
            },
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
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

            {/* Shop-type filter (Shopee-aligned tiers; only for All Shops mode, no-op until API exposes shop_type) */}
            {isShopsMode ? (
              <div className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {SHOP_TYPE_PILLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShopType(s)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gc-primary-strong)]",
                      shopType === s
                        ? "border-[var(--gc-primary-strong)] bg-[var(--gc-primary-strong)] text-white"
                        : "border-[var(--gc-border)] bg-[var(--gc-surface)] text-[var(--gc-text)] hover:border-[var(--gc-primary-strong)] hover:text-[var(--gc-primary-strong)]"
                    )}
                  >
                    {shopTypeLabel(s)}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium text-[var(--gc-text-muted)]">
                {t("discoverSortBy")}
              </span>
              {SHOP_EXPLORE_SORT_PILLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gc-primary-strong)]",
                    sortBy === s
                      ? "border-[var(--gc-primary-strong)] bg-[var(--gc-primary-strong)] text-white"
                      : "border-[var(--gc-border)] bg-[var(--gc-surface)] text-[var(--gc-text)] hover:border-[var(--gc-primary-strong)] hover:text-[var(--gc-primary-strong)]"
                  )}
                >
                  {sortPillLabel(s)}
                </button>
              ))}
              <span className="ml-auto text-sm text-[var(--gc-text-soft)]">
                {offersPending ? "—" : (offers?.total ?? 0)}{" "}
                {isShopsMode ? t("shopExploreResultsUnit") : t("brandsExploreResultsUnit")}
              </span>
            </div>
          </div>

          <MerchantListTracker
            items={sortedOffers}
            listId={isShopsMode ? "merchant_directory_shops" : "merchant_directory_brands"}
            listName={isShopsMode ? "All Shops" : "All Brands"}
            source="shop_directory"
          />

          {/* 1:1 brand-logo cards — denser grid: 2 → 3 → 4 → 5 → 6 cols */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sortedOffers.map((offer, index) => {
              const logoSrc = getOfferSquareLogoSrc(offer, lg);
              const tint = getBrandTileTint(offer._id || offer.offer_name);
              return (
                <div key={offer._id} className="relative flex h-full w-full min-w-0 flex-col">
                  <Link
                    href={`/shop/${offer._id}`}
                    className="absolute inset-0 z-0"
                    aria-label={offer.offer_name_display || offer.offer_name}
                    onClick={() =>
                      trackMerchantSelect({
                        merchant: offer,
                        listId: isShopsMode
                          ? "merchant_directory_shops"
                          : "merchant_directory_brands",
                        listName: isShopsMode ? "All Shops" : "All Brands",
                        position: index + 1,
                        source: "shop_directory",
                      })
                    }
                  />
                  <div className="pointer-events-none relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
                    <CardBrandLogo
                      logo={logoSrc}
                      offer_name={offer.offer_name_display || offer.offer_name}
                      percent={percentLabel(offer)}
                      categories={offer.categories}
                      showGrabCoupon={offerHasGrabCouponBadge(offer)}
                      tint={tint}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <Pagination
              count={offers?.totalPages ?? 1}
              page={offerSearch.page}
              variant="outlined"
              shape="rounded"
              siblingCount={1}
              boundaryCount={1}
              showFirstButton
              showLastButton
              onChange={(_, page) => {
                setOfferSearch((prev) => ({ ...prev, page }));
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
        </div>
      </div>
    </section>
  );
};

export default List;
