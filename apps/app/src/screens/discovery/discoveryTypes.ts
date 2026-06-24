import { type ViewStyle } from "react-native";

import {
  webBrandDirectory,
  webCategoryDirectory,
  webShopDirectory,
} from "@mobile/design/webDesignParity";
import { type MobileRouteId } from "@mobile/navigation/routes";

export type DiscoveryVariant = Extract<MobileRouteId, "brand" | "category" | "discover" | "shops">;
export type CategoryDirectoryItem = (typeof webCategoryDirectory.cards)[number];
export type BrandDirectoryStore = (typeof webBrandDirectory.stores)[number];
export type ShopDirectoryStore = (typeof webShopDirectory.stores)[number];
export type DirectoryPromo = typeof webShopDirectory.promo;
export type WebViewStyle = ViewStyle & {
  transitionDuration?: string;
  transitionProperty?: string;
  transitionTimingFunction?: string;
  willChange?: string;
};
