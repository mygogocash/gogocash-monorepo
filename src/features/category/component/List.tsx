import CardBrandLogo from "@/components/common/card/CardBrandLogo";
import SearchIcon from "@/components/icons/SearchIcon";
import { offerHasGrabCouponBadge } from "@/lib/offer/offerGrabCouponBadge";
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import { Link } from "@/i18n/navigation";
import ShopExploreCategoryAside from "@/features/shop/component/ShopExploreCategoryAside";
import {
  buildShopExploreCategoryMenu,
  normalizeCategoryKey,
} from "@/features/shop/shopExploreCategoryMenu";
import { type ShopExploreSort, sortShopExploreOffers } from "@/features/shop/shopExploreSort";
import { DataOffer, IResponseOffer } from "@/interfaces/offer";
import { IResponseCategory } from "@/interfaces/shop";
import { fetcher } from "@/lib/axios/client";
import { cn, getPercent } from "@/lib/utils";
import { trackMerchantSearch, trackMerchantSelect } from "@/lib/analytics";
import {
  getBrandTileTint,
  getOfferSquareLogoSrc,
} from "@/lib/offer/offerCardVisuals";
import Pagination from "@mui/material/Pagination";
import { useBreakpointMdUp } from "@/hooks/useBreakpointMdUp";
import { useUserCountry } from "@/hooks/useUserCountry";
import { dedupeOffersByBrand } from "@/lib/offer/offerVisibility";
import PolicyTermsSection from "@/features/category/component/PolicyTermsSection";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 320;

const SHOP_EXPLORE_SORT_PILLS: ShopExploreSort[] = [
  "popular",
  "newest",
  "highest_cashback",
  "lowest_cashback",
];

const List = () => {
  const params = useParams();
  const rawName = String(params?.name ?? "");
  const name = (() => {
    try {
      return decodeURIComponent(rawName);
    } catch {
      return rawName;
    }
  })();
  const t = useTranslations();
  const lg = useBreakpointMdUp();
  const [sortBy, setSortBy] = useState<ShopExploreSort>("highest_cashback");
  const [offerSearch, setOfferSearch] = useState({
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
    queryKey: ["getCategory", "category-explore"],
    queryFn: () => fetcher(`/offer/get-category/list`),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const categoryMenuRows = useMemo(
    () => buildShopExploreCategoryMenu(categoryList ?? []),
    [categoryList]
  );

  const queryCategory = useMemo(() => {
    if (!categoryMenuRows.length) return rawName;
    const norm = normalizeCategoryKey(name);
    const row = categoryMenuRows.find((r) => normalizeCategoryKey(r.filterName) === norm);
    return row?.filterName ?? rawName;
  }, [name, rawName, categoryMenuRows]);

  // Resolve the active category's _id from the API list (matched by
  // case/space-normalised name) — needed by `PolicyTermsSection` which
  // calls `GET /policy/category/:id`.
  const currentCategoryId = useMemo(() => {
    if (!categoryList?.length) return null;
    const norm = normalizeCategoryKey(name);
    const cat = categoryList.find((c) => normalizeCategoryKey(c.name) === norm);
    return cat?._id ?? null;
  }, [categoryList, name]);

  const { data: offers, isPending: offersPending } = useQuery<IResponseOffer>({
    queryKey: ["getOfferByCategory", queryCategory, offerSearch],
    queryFn: () =>
      fetcher(
        `/offer?category=${encodeURIComponent(queryCategory)}&search=${encodeURIComponent(offerSearch.search)}&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: Infinity,
    enabled: offerSearch.page > 0 && Boolean(queryCategory),
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

  const searchEventRef = useRef("");

  useEffect(() => {
    const searchTerm = offerSearch.search.trim();
    if (!offers || !searchTerm) return;

    const signature = [queryCategory, offerSearch.page, searchTerm, offers.data.length].join("|");

    if (searchEventRef.current === signature) return;
    searchEventRef.current = signature;

    trackMerchantSearch({
      searchTerm,
      resultsCount: offers.data.length,
      listId: `category_${String(name).toLowerCase()}_results`,
      listName: `Category: ${String(name)}`,
      category: String(queryCategory || name || ""),
    });
  }, [name, queryCategory, offerSearch.page, offerSearch.search, offers]);

  const percentLabel = (offer: DataOffer) => {
    const percent = getPercent(offer.commissions);
    return offer?.commission_store
      ? `${offer.commission_store.toFixed(1)}%`
      : percent
        ? `${percent}%`
        : "0%";
  };

  const listId = `category_${String(name).toLowerCase()}_results`;
  const listName = `Category: ${String(name)}`;

  const categoryHref = (filterName: string) => `/category/${encodeURIComponent(filterName)}`;

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
          {t("categoryPageExploreTitle", { category: name })}
          <span className="ml-2 inline-block align-middle text-[0.85em] font-extrabold" aria-hidden>
            🔎
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--gc-text-muted)]">
          {t("categoryPageExploreSubtitle", { category: name })}
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ShopExploreCategoryAside
          categoryMenuRows={categoryMenuRows}
          activeCategory={name}
          activeCategoryMatch="normalized"
          asideMode={{
            mode: "navigate",
            allHref: "/brand#explore-shop",
            categoryHref,
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
                placeholder={t("categoryPageSearchPlaceholder", { category: name })}
                aria-label={t("categoryPageSearchPlaceholder", { category: name })}
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
                {offersPending ? "—" : t("categoryPageStoreCount", { count: offers?.total ?? 0 })}
              </span>
            </div>
          </div>

          <MerchantListTracker
            items={sortedOffers}
            listId={listId}
            listName={listName}
            category={String(name)}
            source="category_results"
          />
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
                        listId,
                        listName,
                        position: index + 1,
                        source: "category_results",
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
          {/* Phase 3 — admin-authored terms & conditions, gated by
              NEXT_PUBLIC_CATEGORY_POLICY_TERMS. Hidden when no policy is
              authored, when all translations are empty, or when the user's
              locale + fallback chain finds nothing. */}
          <PolicyTermsSection categoryId={currentCategoryId} />
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
