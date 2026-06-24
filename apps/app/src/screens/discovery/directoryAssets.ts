import { type ImageSourcePropType, type TextStyle } from "react-native";

import homeBannerImage from "../../../assets/home-banner.png";
import popularBeautyImage from "../../../assets/popular-beauty.png";
import popularDinnerImage from "../../../assets/popular-dinner.png";
import popularElectronicImage from "../../../assets/popular-electronic.png";
import sideGroceryImage from "../../../assets/home-side-grocery.png";
import sideWatchImage from "../../../assets/home-side-watch.png";
import questBannerImage from "../../../assets/quest-banner-en.png";
import shopPromoGogoQuestImage from "../../../assets/shop-promo-gogoquest.png";
import { motion } from "@mobile/theme/motion";

import { type WebViewStyle } from "./discoveryTypes";

export const productImageAssets: Record<string, ImageSourcePropType> = {
  "home-banner": homeBannerImage,
  "home-side-grocery": sideGroceryImage,
  "home-side-watch": sideWatchImage,
  "popular-beauty": popularBeautyImage,
  "popular-dinner": popularDinnerImage,
  "popular-electronic": popularElectronicImage,
  "quest-banner-en": questBannerImage,
};

export const categoryDirectoryImageAssets: Record<string, ImageSourcePropType> = {
  "popular-beauty": popularBeautyImage,
  "popular-dinner": popularDinnerImage,
  "popular-electronic": popularElectronicImage,
  "quest-banner-en": questBannerImage,
};

export const shopDirectoryImageAssets: Record<string, ImageSourcePropType> = {
  "shop-promo-gogoquest": shopPromoGogoQuestImage,
};

export const webSearchInputFocusReset = {
  outlineStyle: "none",
  outlineWidth: 0,
} as unknown as TextStyle;

export const productDiscoveryDialogTransition: WebViewStyle = {
  transitionDuration: `${motion.duration.fast}ms`,
  transitionProperty: "opacity, transform",
  transitionTimingFunction: motion.cssTransition.timingFunction,
  willChange: "opacity, transform",
};

export { homeBannerImage, shopPromoGogoQuestImage };
