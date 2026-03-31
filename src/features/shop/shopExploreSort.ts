import type { DataFavList, DataOffer } from "@/interfaces/offer";
import { getPercent } from "@/lib/utils";

export type ShopExploreSort = "highest_cashback" | "lowest_cashback" | "popular" | "newest";

export const SHOP_EXPLORE_SORT_VALUES: readonly ShopExploreSort[] = [
  "highest_cashback",
  "lowest_cashback",
  "popular",
  "newest",
] as const;

export function cashbackSortValue(offer: DataOffer): number {
  if (offer.commission_store != null && !Number.isNaN(Number(offer.commission_store))) {
    return Number(offer.commission_store);
  }
  return parseFloat(getPercent(offer.commissions) || "0");
}

export function sortShopExploreOffers(data: DataOffer[], sortBy: ShopExploreSort): DataOffer[] {
  const copy = [...data];
  switch (sortBy) {
    case "highest_cashback":
      return copy.sort((a, b) => cashbackSortValue(b) - cashbackSortValue(a));
    case "lowest_cashback":
      return copy.sort((a, b) => cashbackSortValue(a) - cashbackSortValue(b));
    case "newest":
      return copy.sort(
        (a, b) => new Date(b.datetime_created).getTime() - new Date(a.datetime_created).getTime()
      );
    case "popular":
      return copy.sort((a, b) => b.merchant_id - a.merchant_id);
    default:
      return copy;
  }
}

/** Favorite Brands profile page — Figma Favorite Shops : Desktop */
export type FavoriteShopSort =
  | "highest_cashback"
  | "lowest_cashback"
  | "oldest_added"
  | "latest_added";

export const FAVORITE_SHOP_SORT_VALUES: readonly FavoriteShopSort[] = [
  "highest_cashback",
  "lowest_cashback",
  "oldest_added",
  "latest_added",
] as const;

function favoriteRowCashbackValue(row: DataFavList): number {
  const o = row.offer_id as DataOffer;
  if (o.commission_store != null && !Number.isNaN(Number(o.commission_store))) {
    return Number(o.commission_store);
  }
  return parseFloat(getPercent(o.commissions) || "0");
}

export function sortFavoriteShopRows(rows: DataFavList[], sortBy: FavoriteShopSort): DataFavList[] {
  const copy = [...rows];
  switch (sortBy) {
    case "highest_cashback":
      return copy.sort((a, b) => favoriteRowCashbackValue(b) - favoriteRowCashbackValue(a));
    case "lowest_cashback":
      return copy.sort((a, b) => favoriteRowCashbackValue(a) - favoriteRowCashbackValue(b));
    case "oldest_added":
      return copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case "latest_added":
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    default:
      return copy;
  }
}
