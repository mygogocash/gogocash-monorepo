import { type ImageSourcePropType, type TextStyle, type ViewStyle } from "react-native";

import homeBannerImage from "../../../assets/home-banner.png";
import promoBlackFridayImage from "../../../assets/home-promo-black-friday.png";
import promoHolidayImage from "../../../assets/home-promo-holiday.png";
import promoFashionImage from "../../../assets/home-promo-fashion.png";
import sideGroceryImage from "../../../assets/home-side-grocery.png";
import sideWatchImage from "../../../assets/home-side-watch.png";
import lazadaLogo from "../../../assets/partner-lazada.png";
import sheinLogo from "../../../assets/partner-shein.png";
import shopeeLogo from "../../../assets/partner-shopee.png";
import {
  AirplaneTilt,
  BookOpen as BookOpenIcon,
  CircleUserRound as ProfileIcon,
  DeviceMobile,
  Fire,
  Grid2X2 as GridIcon,
  Heartbeat,
  Home as HomeIcon,
  type IconComponent,
  Link2 as LinkIcon,
  ShoppingBag as ShoppingBagIcon,
  SquaresFour,
  Store as StoreIcon,
  Storefront,
  Tag,
  Tags as TagsIcon,
  Trophy as TrophyIcon,
  WalletCards as WalletIcon,
} from "@mobile/theme/icons";
import { typography } from "@mobile/theme/tokens";

export type HomeIconComponent = IconComponent;

export const heroBannerAssets: Record<string, ImageSourcePropType> = {
  "home-banner": homeBannerImage,
  "home-side-grocery": sideGroceryImage,
  "home-side-watch": sideWatchImage,
  "home-promo-black-friday": promoBlackFridayImage,
  "home-promo-holiday": promoHolidayImage,
  "home-promo-fashion": promoFashionImage,
};

export const brandLogoAssets: Record<string, ImageSourcePropType> = {
  lazada: lazadaLogo,
  shein: sheinLogo,
  shopee: shopeeLogo,
};

// #497 — the mobile explore bar mirrors the desktop nav, so it must cover every icon the
// desktop items use. ShortcutIcon silently falls back to a shopping bag for unknown names,
// which would render four identical bags rather than an error.
export const shortcutIcons: Record<string, HomeIconComponent> = {
  education: BookOpenIcon,
  electronics: DeviceMobile,
  fire: Fire,
  health: Heartbeat,
  promotion: TagsIcon,
  shop: StoreIcon,
  shops: GridIcon,
  travel: AirplaneTilt,
};

export const desktopNavIcons: Record<string, IconComponent> = {
  electronics: DeviceMobile,
  health: Heartbeat,
  promotion: Tag,
  shop: Storefront,
  shops: SquaresFour,
  travel: AirplaneTilt,
};

export const bottomNavIcons: Record<string, HomeIconComponent> = {
  golink: LinkIcon,
  home: HomeIcon,
  profile: ProfileIcon,
  quest: TrophyIcon,
  wallet: WalletIcon,
};

export const homeIconStrokeWidth = typography.iconStrokeWidth;

export const webSearchInputFocusReset = {
  outlineStyle: "none",
  outlineWidth: 0,
} as unknown as TextStyle;

// Web-only frosted-depth gradient for the GoLink banner surface (ignored on native,
// where desktopGoLinkBackdrop's solid backgroundColor stands in).
export const goLinkBackdropGradient = {
  backgroundImage: "linear-gradient(120deg, #E6F7EF 0%, #EEF4FF 58%, #E1EFFF 100%)",
} as unknown as ViewStyle;

export const mobileTabletHeaderGradient = {
  backgroundImage: "linear-gradient(135deg, #006B52 0%, #009D78 48%, #20C7A1 100%)",
} as unknown as ViewStyle;

export const homeGoLinkShopNowRoute = "/shop/brand-orbit-airways-1003?golinkContinue=1";

export { ShoppingBagIcon, HomeIcon };
