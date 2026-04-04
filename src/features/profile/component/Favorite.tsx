"use client";

import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import FavoriteShopCard from "@/features/profile/component/FavoriteShopCard";
import FavoriteShopsEmptyState from "@/features/profile/component/FavoriteShopsEmptyState";
import FavoriteStoreHero from "@/features/profile/component/FavoriteStoreHero";
import SubPage from "../layout/SubPage";
import type {
  DataFav,
  DataFavList,
  DataOffer,
  IResponseFav,
  IResponseOffer,
} from "@/interfaces/offer";
import { fetcher } from "@/lib/axios/client";
import { favoriteOffer } from "@/lib/services/offer";
import { banner, getPercent, pathImage } from "@/lib/utils";
import {
  FAVORITE_SHOP_SORT_VALUES,
  type FavoriteShopSort,
  sortFavoriteShopRows,
} from "@/features/shop/shopExploreSort";
import { trackFavoriteToggle } from "@/lib/analytics";
import {
  FormControl,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  TextField,
  type SelectChangeEvent,
} from "@mui/material";
import { useMediaQuery } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import SearchIcon from "@mui/icons-material/Search";

const FAVORITE_FETCH = { page: 1, limit: 200 };
const PAGE_SIZE = 18;

function percentLabelForOffer(offer: DataOffer): string {
  if (offer.commission_store != null && !Number.isNaN(Number(offer.commission_store))) {
    return `${Number(offer.commission_store).toFixed(1)}%`;
  }
  return getPercent(offer.commissions, true) || "0%";
}

function percentLabelForFavRow(offer: DataFavList["offer_id"]): string {
  return percentLabelForOffer(offer as unknown as DataOffer);
}

function logoSrcForFavoriteItem(item: DataFavList): string {
  const o = item.offer_id;
  const src = o.logo_desktop || o.logo_mobile || o.logo;
  return src ? pathImage(src) : "";
}

function logoSrcForDataOffer(offer: DataOffer, lg: boolean): string {
  if (offer.logo_desktop || offer.logo_mobile || offer.logo) {
    return pathImage(offer.logo_desktop || offer.logo_mobile || offer.logo);
  }
  const b = offer.banner || offer.banner_mobile;
  if (b) {
    return banner(offer.banner_mobile, offer.banner, lg);
  }
  return "/home/banner.webp";
}

const FavoriteList = () => {
  const router = useRouter();
  const t = useTranslations();
  const lg = useMediaQuery("(min-width:768px)");
  const [sortBy, setSortBy] = useState<FavoriteShopSort>("highest_cashback");
  const [search, setSearch] = useState("");
  const [listPage, setListPage] = useState(1);

  const { data: recentOffers } = useQuery<IResponseOffer>({
    queryKey: ["favoritePageRecentOffers"],
    queryFn: () => fetcher(`/offer?category=&search=&limit=6&page=1`),
    staleTime: 60_000,
  });

  const {
    data: getFavouriteOffer,
    refetch: refetchFavList,
    isFetched: favoritesFetched,
  } = useQuery<IResponseFav>({
    queryKey: ["getFavouriteOfferList", FAVORITE_FETCH],
    queryFn: () => fetcher(`/offer/favorite/${FAVORITE_FETCH.page}/${FAVORITE_FETCH.limit}`),
    staleTime: 0,
    enabled: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const { mutateAsync: mutateFav } = useMutation({
    mutationKey: ["mutateFav"],
    mutationFn: favoriteOffer,
    onSuccess(data: DataFav, variables) {
      const favoriteOfferItem = getFavouriteOffer?.data.find(
        (item) => item.offer_id?._id === variables.offer_id
      );

      if (favoriteOfferItem?.offer_id) {
        trackFavoriteToggle({
          merchant: favoriteOfferItem.offer_id,
          action: "remove",
          location: "favorite_page",
        });
      }

      if (data) {
        toast.success("Favorite offer successfully");
      } else {
        toast.success("Unfavorite offer successfully");
      }
      refetchFavList();
    },
    onError(_error: { data?: { message?: string } }) {
      toast.error(_error?.data?.message || "Failed to favorite this offer");
    },
  });

  const filteredSortedFavorites = useMemo(() => {
    const rows = getFavouriteOffer?.data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q.length
      ? rows.filter((row) => {
          const name = row.offer_id?.offer_name_display || row.offer_id?.offer_name || "";
          return name.toLowerCase().includes(q);
        })
      : rows;
    return sortFavoriteShopRows(filtered, sortBy);
  }, [getFavouriteOffer?.data, search, sortBy]);

  const favoriteTotalPages = Math.max(1, Math.ceil(filteredSortedFavorites.length / PAGE_SIZE));

  const pagedFavorites = useMemo(() => {
    const start = (listPage - 1) * PAGE_SIZE;
    return filteredSortedFavorites.slice(start, start + PAGE_SIZE);
  }, [filteredSortedFavorites, listPage]);

  const recentList = recentOffers?.data ?? [];

  const rawFavoriteCount = getFavouriteOffer?.data?.length ?? 0;
  const hasNoFavoriteBrands = favoritesFetched && rawFavoriteCount === 0;
  const searchYieldedNoResults =
    !hasNoFavoriteBrands && rawFavoriteCount > 0 && filteredSortedFavorites.length === 0;

  return (
    <SubPage title="Favorite Brands" showSubMenu>
      <div className="flex flex-col gap-10">
        <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-[#3b3b3b]">
          {t("Favorite Brands")}
        </h1>

        <FavoriteStoreHero onSeeMore={() => router.push("/shop")} />

        <section className="flex flex-col gap-4" aria-labelledby="favorite-recent-heading">
          <h2
            id="favorite-recent-heading"
            className="text-xl font-semibold text-[#3b3b3b] md:text-2xl"
          >
            {t("favoritePageRecentVisit")}
          </h2>
          <MerchantListTracker
            items={recentList}
            listId="favorite_recent_visit"
            listName="Recently Visited Brands"
            source="favorite_page"
          />
          <div className="grid grid-cols-2 justify-items-center gap-4 sm:gap-6 xl:grid-cols-3">
            {recentList.map((offer, index) => (
              <FavoriteShopCard
                key={offer._id}
                logoSrc={logoSrcForDataOffer(offer, lg)}
                offerName={offer.offer_name_display || offer.offer_name}
                percentLabel={percentLabelForOffer(offer)}
                shopHref={`/shop/${offer._id}`}
                showGrabCoupon={
                  offer.extra_point != null && Number(offer.extra_point) > 0 ? true : false
                }
                trackingOffer={offer}
                trackingContext={{
                  listId: "favorite_recent_visit",
                  listName: "Recently Visited Brands",
                  position: index + 1,
                  source: "favorite_page",
                }}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="favorite-shops-heading">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2
              id="favorite-shops-heading"
              className="text-xl font-semibold text-[#3b3b3b] md:text-2xl"
            >
              {t("favoritePageYourFavoriteBrands")}
            </h2>
            {!hasNoFavoriteBrands ? (
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 lg:w-auto">
                <TextField
                  size="small"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setListPage(1);
                  }}
                  placeholder={t("favoritePageSearchPlaceholder")}
                  aria-label={t("favoritePageSearchPlaceholder")}
                  className="min-w-0 sm:min-w-[220px] lg:min-w-[280px]"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: "#989898", fontSize: 22 }} aria-hidden />
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: "16px",
                        backgroundColor: "#fff",
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e4e4e4" },
                      },
                    },
                  }}
                />
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <span className="shrink-0 text-sm font-medium text-[#3b3b3b]">
                    {t("sortByLabel")}
                  </span>
                  <FormControl
                    size="small"
                    className="min-w-0 flex-1 sm:min-w-[220px] sm:flex-none"
                  >
                    <Select<FavoriteShopSort>
                      value={sortBy}
                      onChange={(e: SelectChangeEvent<FavoriteShopSort>) => {
                        setSortBy(e.target.value as FavoriteShopSort);
                        setListPage(1);
                      }}
                      inputProps={{ "aria-label": t("sortByLabel") }}
                      sx={{
                        borderRadius: "16px",
                        width: { xs: "100%", sm: 220 },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e4e4e4" },
                      }}
                    >
                      {FAVORITE_SHOP_SORT_VALUES.map((value) => (
                        <MenuItem key={value} value={value}>
                          {t(`sortOption_${value}`)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>
            ) : null}
          </div>

          {!hasNoFavoriteBrands && pagedFavorites.length > 0 ? (
            <MerchantListTracker
              items={pagedFavorites.map((row) => row.offer_id as unknown as DataOffer)}
              listId="favorite_merchants"
              listName="Favorite Brands"
              source="favorite_page"
            />
          ) : null}

          {hasNoFavoriteBrands ? (
            <FavoriteShopsEmptyState />
          ) : searchYieldedNoResults ? (
            <p className="py-12 text-center text-base text-[#7f7f7f]" role="status">
              {t("favoritePageNoSearchResults")}
            </p>
          ) : (
            <div className="grid grid-cols-2 justify-items-center gap-4 sm:gap-6 xl:grid-cols-3">
              {pagedFavorites.map((item, index) => {
                const offer = item.offer_id;
                const globalIndex = (listPage - 1) * PAGE_SIZE + index + 1;
                return (
                  <FavoriteShopCard
                    key={item._id}
                    logoSrc={logoSrcForFavoriteItem(item)}
                    offerName={offer?.offer_name_display || offer?.offer_name || ""}
                    percentLabel={percentLabelForFavRow(offer)}
                    shopHref={`/shop/${offer?._id}`}
                    favorite
                    onToggleFavorite={() => {
                      if (offer?._id) {
                        void mutateFav({ offer_id: offer._id });
                      }
                    }}
                    showGrabCoupon={(() => {
                      const ep = (offer as unknown as DataOffer).extra_point;
                      return ep != null && Number(ep) > 0;
                    })()}
                    trackingOffer={offer}
                    trackingContext={{
                      listId: "favorite_merchants",
                      listName: "Favorite Brands",
                      position: globalIndex,
                      source: "favorite_page",
                    }}
                  />
                );
              })}
            </div>
          )}

          {!hasNoFavoriteBrands && favoriteTotalPages > 1 ? (
            <div className="flex justify-center pt-4">
              <Pagination
                count={favoriteTotalPages}
                page={listPage}
                variant="outlined"
                shape="rounded"
                siblingCount={1}
                boundaryCount={1}
                showFirstButton
                showLastButton
                onChange={(_, page) => setListPage(page)}
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
        </section>
      </div>
    </SubPage>
  );
};

export default FavoriteList;
