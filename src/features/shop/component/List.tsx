"use client";

import CardSpecial from "@/components/common/card/CardSpecial";
import SearchIcon from "@/components/icons/SearchIcon";
import { offerHasGrabCouponBadge } from "@/lib/offer/offerGrabCouponBadge";
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import { Link } from "@/i18n/navigation";
import { DataOffer, IResponseOffer } from "@/interfaces/offer";
import { IResponseCategory } from "@/interfaces/shop";
import { fetcher } from "@/lib/axios/client";
import { banner, cn, getPercent } from "@/lib/utils";
import { trackMerchantSelect } from "@/lib/analytics";
import ShopExploreCategoryAside from "@/features/shop/component/ShopExploreCategoryAside";
import { buildShopExploreCategoryMenu } from "@/features/shop/shopExploreCategoryMenu";
import { type ShopExploreSort, sortShopExploreOffers } from "@/features/shop/shopExploreSort";
import Pagination from "@mui/material/Pagination";
import { useBreakpointMdUp } from "@/hooks/useBreakpointMdUp";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 320;

/** Pill order aligned with Discover (Popular / Latest / High Cashback) plus lowest cashback. */
const SHOP_EXPLORE_SORT_PILLS: ShopExploreSort[] = [
  "popular",
  "newest",
  "highest_cashback",
  "lowest_cashback",
];

const List = () => {
  const t = useTranslations();
  const lg = useBreakpointMdUp();
  const [sortBy, setSortBy] = useState<ShopExploreSort>("highest_cashback");
  const [offerSearch, setOfferSearch] = useState({
    category: "",
    page: 1,
    limit: 18,
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

  const sortedOffers = useMemo(() => {
    if (!offers?.data?.length) return [];
    return sortShopExploreOffers(offers.data, sortBy);
  }, [offers, sortBy]);

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

  return (
    <section id="explore-shop" className="gc-home-layout gc-page-block w-full scroll-mt-24 pb-10">
      <header className="mb-8 md:mb-10">
        <h1 className="gc-section-title">
          {t("shopExploreTitle")}
          <span className="ml-2 inline-block align-middle text-[0.85em] font-extrabold" aria-hidden>
            🔎
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--gc-text-muted)]">
          {t("shopExploreSubtitle")}
        </p>
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
          <div className="gc-surface-card sticky top-[80px] z-20 flex flex-col gap-3 px-4 py-3">
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
              {SHOP_EXPLORE_SORT_PILLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
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
                {offersPending ? "—" : (offers?.total ?? 0)} {t("shopExploreResultsUnit")}
              </span>
            </div>
          </div>

          <MerchantListTracker
            items={sortedOffers}
            listId="merchant_directory"
            listName="All Stores"
            source="shop_directory"
          />
          <div className="grid grid-cols-2 justify-items-stretch gap-3 sm:gap-6 xl:grid-cols-3">
            {sortedOffers.map((offer, index) => {
              const bannerSrc =
                offer.banner || offer.banner_mobile
                  ? banner(offer.banner_mobile, offer.banner, lg)
                  : "/home/banner.webp";

              return (
                <div key={offer._id} className="relative block w-full min-w-0">
                  <Link
                    href={`/shop/${offer._id}`}
                    className="absolute inset-0 z-0"
                    aria-label={offer.offer_name_display || offer.offer_name}
                    onClick={() =>
                      trackMerchantSelect({
                        merchant: offer,
                        listId: "merchant_directory",
                        listName: "All Stores",
                        position: index + 1,
                        source: "shop_directory",
                      })
                    }
                  />
                  <div className="pointer-events-none relative z-[1]">
                    <CardSpecial
                      directoryGrid
                      banner={bannerSrc}
                      offer_name={offer.offer_name_display || offer.offer_name}
                      percent={percentLabel(offer)}
                      categories={offer.categories}
                      showGrabCoupon={offerHasGrabCouponBadge(offer)}
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
