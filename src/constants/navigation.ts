export type AppIconKey =
  | "home"
  | "shop"
  | "golink"
  | "wallet"
  | "quest"
  | "profile"
  | "travel"
  | "electronic"
  | "beauty"
  | "category"
  | "help"
  | "referral"
  | "favorite"
  | "language"
  | "withdraw"
  | "method";

export interface NavigationItem {
  label: string;
  translationKey?: string;
  href: string;
  icon?: AppIconKey;
}

export const desktopShortcutNav: NavigationItem[] = [
  {
    label: "Shop",
    translationKey: "shop",
    href: "/brand",
    icon: "shop",
  },
  {
    label: "Travel",
    translationKey: "travel",
    href: "/category/Travel",
    icon: "travel",
  },
  {
    label: "Electronics",
    translationKey: "electronic",
    href: "/category/Electronics",
    icon: "electronic",
  },
  {
    label: "Health & Beauty",
    translationKey: "beauty",
    href: "/category/Health & Beauty",
    icon: "beauty",
  },
];

/** Desktop secondary menu (Figma MenuBar 93:4121): flat tabs, underline active state */
/** Leading icons: Figma Icon library (Streamline Core) node 6:30038 — https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=6-30038 */
export type DesktopMenuBarIcon =
  | "none"
  | "promotion"
  | "shop"
  | "shops"
  | "travel"
  | "electronic"
  | "beauty"
  | "digital"
  | "education"
  | "help";

export interface DesktopMenuBarItem {
  id: string;
  translationKey: string;
  href: string;
  icon: DesktopMenuBarIcon;
  /** First tab shows fire emoji after label (Figma “Top Brands”) */
  showFire?: boolean;
  /** Figma 8270-82095: body-s 14px medium vs lead 16px regular */
  menuTypography?: "body-sm" | "lead";
  /** Figma Top Brands tab min width */
  wideTab?: boolean;
  external?: boolean;
  /** Resolve URL via getSupportHref(region) */
  supportOnly?: boolean;
  /** Opens Product Discover (merchant × product rates) instead of navigating to `href`. */
  productDiscover?: boolean;
}

export const desktopMenuBarNav: DesktopMenuBarItem[] = [
  {
    id: "top-brands",
    translationKey: "navTopBrands",
    href: "/",
    icon: "none",
    showFire: true,
  },
  {
    id: "all-brands",
    translationKey: "navAllBrands",
    href: "/brand",
    icon: "shop",
  },
  {
    id: "all-shops",
    translationKey: "navAllShops",
    href: "/shops",
    icon: "shops",
  },
  {
    id: "product-discover",
    translationKey: "navProductDiscover",
    href: "/discover",
    icon: "promotion",
    menuTypography: "lead",
  },
  {
    id: "travel",
    translationKey: "travel",
    href: "/category/Travel",
    icon: "travel",
  },
  {
    id: "electronics",
    translationKey: "navElectronics",
    href: "/category/Electronics",
    icon: "electronic",
    menuTypography: "lead",
  },
  {
    id: "health-beauty",
    translationKey: "navHealthBeauty",
    href: "/category/Health & Beauty",
    icon: "beauty",
    menuTypography: "lead",
  },
  {
    id: "digital-services",
    translationKey: "navDigitalServices",
    href: "/category/Digital Services",
    icon: "digital",
  },
];

export const mobileNavItems: NavigationItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "GoGoLink", translationKey: "navMobileGogoLink", href: "/golink", icon: "golink" },
  { label: "Wallet", href: "/wallet", icon: "wallet" },
  { label: "Quest", href: "/quest", icon: "quest" },
  { label: "Profile", href: "/profile", icon: "profile" },
];

/** LINE Official Account — Help / support (desktop menu bar + regional fallback). */
export const SUPPORT_LINE_OFFICIAL_HREF = "https://lin.ee/7om5sAr";

/** GoGoCash hub — social, events, QuestN, support links (profile sidebar “Connect with GoGoCash”). */
export const GOGOCASH_LINKTREE_HREF = "https://linktr.ee/gogocash";

/** GitBook — Learn center “How to register?” (Missing Orders User Guide quick card). */
export const GOGOCASH_GITBOOK_LEARN_REGISTER_HREF =
  "https://gogocash.gitbook.io/doc/learn-center/how-to-register";

/** GitBook — Learn center “How to Shopping?” (Missing Orders Cashback quick card). */
export const GOGOCASH_GITBOOK_LEARN_SHOPPING_HREF =
  "https://gogocash.gitbook.io/doc/learn-center/how-to-shopping";

/**
 * Figma — Missing Orders (profile sidebar). Opens design spec in a new tab.
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=9621-207632
 */
export const MISSING_ORDERS_FIGMA_HREF =
  "https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=9621-207632&t=CAdomPs4ttKWtkdI-4";

export const getSupportHref = (region?: string) => {
  void region;
  return SUPPORT_LINE_OFFICIAL_HREF;
};
