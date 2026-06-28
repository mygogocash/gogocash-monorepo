import { type ViewStyle } from "react-native";

import {
  webCategoryDirectory,
  webShopDirectory,
} from "@mobile/design/webDesignParity";
import { type MobileRouteId } from "@mobile/navigation/routes";

export type DiscoveryVariant = Extract<MobileRouteId, "brand" | "category" | "discover" | "shops">;

type FixtureCategoryDirectoryItem = (typeof webCategoryDirectory.cards)[number];
/** Widened so live category cards from the API share the same shape as fixtures. */
export type CategoryDirectoryItem = Omit<
  FixtureCategoryDirectoryItem,
  "href" | "imageAsset" | "title"
> & {
  href: string;
  imageAsset: string;
  title: string;
};

/** Runtime directory row — fixtures and live API offers both satisfy this shape. */
export type BrandDirectoryStore = {
  addedAt: string;
  brand: string;
  cashback: string;
  category: string;
  href: string;
  id: string;
  label: string;
  logoUri: string;
  popularity: number;
  position: number;
  showGrabCoupon: boolean;
  shopType: string;
  tint: string;
};

export type ShopDirectoryStore = BrandDirectoryStore;
export type DirectoryPromo = typeof webShopDirectory.promo;
export type WebViewStyle = ViewStyle & {
  transitionDuration?: string;
  transitionProperty?: string;
  transitionTimingFunction?: string;
  willChange?: string;
};
