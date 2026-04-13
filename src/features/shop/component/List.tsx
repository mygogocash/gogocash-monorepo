"use client";

import CardSpecial from "@/components/common/card/CardSpecial";
import { offerHasGrabCouponBadge } from "@/lib/offer/offerGrabCouponBadge";
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import { Link } from "@/i18n/navigation";
import { DataOffer, IResponseOffer } from "@/interfaces/offer";
import { IResponseCategory } from "@/interfaces/shop";
import { fetcher } from "@/lib/axios/client";
import { banner, getPercent } from "@/lib/utils";
import { trackMerchantSelect } from "@/lib/analytics";
import ShopExploreCategoryAside from "@/features/shop/component/ShopExploreCategoryAside";
import { buildShopExploreCategoryMenu } from "@/features/shop/shopExploreCategoryMenu";
import {
  SHOP_EXPLORE_SORT_VALUES,
  type ShopExploreSort,
  sortShopExploreOffers,
} from "@/features/shop/shopExploreSort";
import { FormControl, MenuItem, Pagination, Select, type SelectChangeEvent } from "@mui/material";
import { useBreakpointMdUp } from "@/hooks/useBreakpointMdUp";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

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

  const { data: offers } = useQuery<IResponseOffer>({
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

  return (
    <section id="explore-shop" className="gc-home-layout gc-section w-full scroll-mt-24 pb-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="min-w-0 text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-tight text-[#3b3b3b]">
            {t("shopExploreTitle")}
            <span className="ml-2 inline-block" aria-hidden>
              🔎
            </span>
          </h2>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 md:w-auto">
            <span className="shrink-0 text-sm font-medium text-[#3b3b3b]">{t("sortByLabel")}</span>
            <FormControl size="small" className="min-w-0 sm:min-w-[220px]">
              <Select<ShopExploreSort>
                value={sortBy}
                onChange={(e: SelectChangeEvent<ShopExploreSort>) =>
                  setSortBy(e.target.value as ShopExploreSort)
                }
                inputProps={{ "aria-label": t("sortByLabel") }}
                sx={{
                  borderRadius: "16px",
                  width: { xs: "100%", sm: 220 },
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e4e4e4" },
                }}
              >
                {SHOP_EXPLORE_SORT_VALUES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`sortOption_${value}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

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

          <div className="min-w-0 flex-1">
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
      </div>
    </section>
  );
};

export default List;
