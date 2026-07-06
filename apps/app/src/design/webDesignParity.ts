import { toastErrorMessages } from "@mobile/i18n/toastMessages";

export const webHomeSectionOrder = [
  "stickySearch",
  "browseShortcuts",
  "banner",
  "extra",
  "trending",
  "categoryHome",
] as const;

export const mobileShellLayout = {
  contentMaxWidth: 1440,
  contentHorizontalPadding: 16,
  contentHorizontalPaddingMax: 120,
  contentHorizontalPaddingRatio: 0.04,
  desktopBreakpoint: 1024,
  // Tablet tier (portrait tablets / split-view, ~768-1023px). Below desktop, above
  // phone. Single-column content (forms, detail, hubs) is centered to
  // tabletContentMaxWidth so it does not stretch edge-to-edge into a blown-up phone.
  tabletBreakpoint: 768,
  tabletContentMaxWidth: 720,
  tabletContentHorizontalPadding: 32,
  // Centered-canvas FIXED content width per class. As the window grows past these,
  // the content width stays fixed and only the empty L/R gutters grow:
  // contentWidth = min(viewportWidth, canvas{class}Width), centered.
  canvasMobileWidth: 430,
  canvasTabletWidth: 820,
  canvasDesktopWidth: 1280,
  desktopContentHorizontalPadding: 16,
  desktopContentMaxWidth: 1440,
  desktopBottomClearance: 40,
  desktopHeaderHeight: 80,
  desktopHeaderPaddingMax: 120,
  desktopHeaderPaddingMin: 56,
  desktopHeaderPaddingRatio: 0.055,
  desktopSubNavHeight: 56,
  desktopHomeTopGap: 64,
  desktopHomeStackGap: 40,
  // Space between page content and the full-bleed desktop footer band (margin + inner
  // padding). Do not also gap the scroll container before the footer — that stacks.
  desktopFooterTopMargin: 40,
  desktopFooterTopPadding: 56,
  contentTopGap: 24,
  // Promotion banners are designed at 1920x1080 (16:9). Show the FULL design fit
  // to width (no crop) on every class; size is governed by the per-class canvas
  // width, never by cropping the banner.
  homeBannerAspectRatio: 1920 / 1080,
  homeSideBannerAspectRatio: 1920 / 1080,
  compactBrandGridGap: 10,
  compactBrandMobileColumns: 3,
  compactBrandMobileRowsPerPage: 2,
  compactBrandDesktopColumns: 8,
  compactBrandDesktopRowsPerPage: 2,
  compactBrandMetaHeight: 43,
  shortcutPillHeight: 38,
  topBrandDesktopDotCount: 3,
  topBrandDesktopColumns: 6,
  topBrandDesktopGridGap: 24,
  topBrandGridGap: 24,
  topBrandMobileDotCount: 4,
  topBrandMobileGridGap: 12,
  topBrandMobilePageCardCount: 4,
  topBrandMobileColumns: 2,
  topBrandTabletColumns: 3,
  // Tablet portrait/split (768-1023px): 4 across so cards stay compact.
  topBrandTabletPortraitColumns: 4,
  topBrandTabletGridGap: 16,
  // Space reserved below the square logo for the L BrandCard meta: 6 logo->title margin
  // + 20 title line + 6 title->cashback margin + 22 cashback line (+2 buffer). Must stay
  // >= that sum, else the flex-shrinkable title absorbs the overflow and clips its text.
  topBrandMetaHeight: 56,
  compactBrandLogoCardHeight: 167,
  compactBrandLogoVisualHeight: 106,
  homePromoSectionGap: 24,
  homeSectionHeaderHeight: 56,
  searchPopoverActionMinWidth: 100,
  searchPopoverResultRowGap: 10,
  bottomNavMaxWidth: 448,
  bottomNavClearance: 108,
} as const;

function roundLayoutValue(value: number) {
  return Number(value.toFixed(2));
}

function clampLayoutValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getCarouselDotCount(itemCount: number, pageSize: number) {
  if (itemCount <= 0 || pageSize <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function getCarouselActiveIndex({
  contentOffsetX,
  pageCount,
  pageWidth,
}: {
  contentOffsetX: number;
  pageCount: number;
  pageWidth: number;
}) {
  if (pageCount <= 0 || pageWidth <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(pageCount - 1, Math.round(contentOffsetX / pageWidth)));
}

export function getDesktopFooterGrid(viewportWidth: number) {
  // Mirrors web Footer.tsx grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-16:
  // columns collapse 3 -> 2 -> 1 and the gap steps 64 (lg) down to 32 on narrower widths.
  if (viewportWidth >= 1024) {
    return { columns: 3, gap: 64, columnBasis: "auto" as const };
  }

  if (viewportWidth >= 768) {
    return { columns: 3, gap: 32, columnBasis: "auto" as const };
  }

  if (viewportWidth >= 640) {
    return { columns: 2, gap: 32, columnBasis: "45%" as const };
  }

  return { columns: 1, gap: 32, columnBasis: "100%" as const };
}

// Fixed brand-card dimensions — product decision: a brand card is a constant size on
// every display, no longer scaling with the viewport.
//   L (Top Brands)     176 x 224
//   S (compact brand)  144 x 176, logo area 117 (117 + 43 meta + 16 padding = 176)
const FIXED_TOP_BRAND_CARD_WIDTH = 176;
const FIXED_TOP_BRAND_CARD_HEIGHT = 224;
const FIXED_COMPACT_BRAND_CARD_WIDTH = 144;
const FIXED_COMPACT_BRAND_CARD_HEIGHT = 176;
const FIXED_COMPACT_BRAND_LOGO_VISUAL_HEIGHT = 117;
const MOBILE_TABLET_HOME_SECTION_HORIZONTAL_PADDING = 24;

/** How many fixed-width brand cards fit in one row inside the desktop content frame. */
export function getDesktopBrandColumnsPerRow(
  frameWidth: number,
  cardWidth: number,
  gap: number
) {
  return Math.max(1, Math.floor((frameWidth + gap) / (cardWidth + gap)));
}

export function getScaledCompactBrandCardMetrics(cardWidth: number) {
  const scale = cardWidth / FIXED_COMPACT_BRAND_CARD_WIDTH;
  const logoVisualHeight = Math.round(FIXED_COMPACT_BRAND_LOGO_VISUAL_HEIGHT * scale);
  // Logo area scales with column width, but title + cashback typography stays fixed
  // (14px / 16px). Reserve compactBrandMetaHeight so scaled grid cards never clip text.
  const cardHeight =
    16 + logoVisualHeight + mobileShellLayout.compactBrandMetaHeight;

  return {
    cardHeight,
    logoVisualHeight,
  };
}

type HomeDesignVersion = "mobile" | "tablet" | "desktop";

const homeDesignVersions: Record<
  HomeDesignVersion,
  {
    compactBrandCardHeight: number;
    compactBrandCardWidth: number;
    compactBrandColumns: number;
    compactBrandLogoVisualHeight: number;
    contentWidth: number;
    topBrandCardHeight: number;
    topBrandCardWidth: number;
    topBrandColumns: number;
  }
> = {
  desktop: {
    compactBrandCardHeight: FIXED_COMPACT_BRAND_CARD_HEIGHT,
    compactBrandCardWidth: FIXED_COMPACT_BRAND_CARD_WIDTH,
    compactBrandColumns: mobileShellLayout.compactBrandDesktopColumns,
    compactBrandLogoVisualHeight: FIXED_COMPACT_BRAND_LOGO_VISUAL_HEIGHT,
    contentWidth: 1200,
    topBrandCardHeight: FIXED_TOP_BRAND_CARD_HEIGHT,
    topBrandCardWidth: FIXED_TOP_BRAND_CARD_WIDTH,
    topBrandColumns: mobileShellLayout.topBrandDesktopColumns,
  },
  tablet: {
    compactBrandCardHeight: FIXED_COMPACT_BRAND_CARD_HEIGHT,
    compactBrandCardWidth: FIXED_COMPACT_BRAND_CARD_WIDTH,
    compactBrandColumns: 5,
    compactBrandLogoVisualHeight: FIXED_COMPACT_BRAND_LOGO_VISUAL_HEIGHT,
    contentWidth: 900,
    topBrandCardHeight: FIXED_TOP_BRAND_CARD_HEIGHT,
    topBrandCardWidth: FIXED_TOP_BRAND_CARD_WIDTH,
    topBrandColumns: 4,
  },
  mobile: {
    compactBrandCardHeight: FIXED_COMPACT_BRAND_CARD_HEIGHT,
    compactBrandCardWidth: FIXED_COMPACT_BRAND_CARD_WIDTH,
    compactBrandColumns: 2,
    compactBrandLogoVisualHeight: FIXED_COMPACT_BRAND_LOGO_VISUAL_HEIGHT,
    contentWidth: 480,
    topBrandCardHeight: FIXED_TOP_BRAND_CARD_HEIGHT,
    topBrandCardWidth: FIXED_TOP_BRAND_CARD_WIDTH,
    topBrandColumns: mobileShellLayout.topBrandMobileColumns,
  },
};

function getHomeDesignVersion(viewportWidth: number): HomeDesignVersion {
  if (viewportWidth >= 1200) {
    return "desktop";
  }

  if (viewportWidth >= mobileShellLayout.tabletBreakpoint) {
    return "tablet";
  }

  return "mobile";
}

function getProfileContentFrameWidth(viewportWidth: number, version: HomeDesignVersion) {
  // Content fills the device minus a consistent edge gap, capped per tier so it never gets
  // too wide on large screens. Whatever's left becomes flexible side padding that centers
  // the content (see getProfileHorizontalPadding) — so a single frame fits every device.
  const tierMaxWidth = homeDesignVersions[version].contentWidth;
  const minEdgePadding = version === "mobile" ? 16 : 24;
  return roundLayoutValue(Math.max(0, Math.min(tierMaxWidth, viewportWidth - minEdgePadding * 2)));
}

function getProfileHorizontalPadding(viewportWidth: number, contentWidth: number) {
  // Flexible: whatever's left after the capped content frame, split evenly to center it.
  return roundLayoutValue(Math.max(0, (viewportWidth - contentWidth) / 2));
}

export function getResponsiveHomeLayoutMetrics(viewportWidth: number) {
  const isDesktop = viewportWidth >= mobileShellLayout.desktopBreakpoint;
  const designVersion = getHomeDesignVersion(viewportWidth);
  const designFrame = homeDesignVersions[designVersion];
  const contentMaxWidth = mobileShellLayout.contentMaxWidth;
  const contentWidth = getProfileContentFrameWidth(viewportWidth, designVersion);
  const contentHorizontalPadding = getProfileHorizontalPadding(viewportWidth, contentWidth);
  const brandSectionFrameWidth = isDesktop
    ? contentWidth
    : roundLayoutValue(
        Math.max(0, contentWidth - MOBILE_TABLET_HOME_SECTION_HORIZONTAL_PADDING * 2)
      );
  // Mobile/tablet: fixed 8-column x 2-row groups slide horizontally with a peek card.
  // Desktop: fit the content frame — two rows, as many columns as the frame allows.
  const mobileGroupBrandColumns = 8;
  const topBrandCardWidth = designFrame.topBrandCardWidth;
  const topBrandGap = 16;
  const isMobileTopBrandGrid = false;
  const topBrandColumnsPerRow = isDesktop
    ? getDesktopBrandColumnsPerRow(brandSectionFrameWidth, topBrandCardWidth, topBrandGap)
    : mobileGroupBrandColumns;
  const topBrandGroupWidth = isDesktop
    ? brandSectionFrameWidth
    : roundLayoutValue(
        mobileGroupBrandColumns * topBrandCardWidth +
          (mobileGroupBrandColumns - 1) * topBrandGap
      );
  const compactBrandCardWidth = designFrame.compactBrandCardWidth;
  const compactBrandGap = 16;
  const compactBrandColumnsPerRow = isDesktop
    ? getDesktopBrandColumnsPerRow(
        brandSectionFrameWidth,
        compactBrandCardWidth,
        compactBrandGap
      )
    : mobileGroupBrandColumns;
  const compactBrandGroupWidth = isDesktop
    ? brandSectionFrameWidth
    : roundLayoutValue(
        mobileGroupBrandColumns * compactBrandCardWidth +
          (mobileGroupBrandColumns - 1) * compactBrandGap
      );
  const compactBrandLogoVisualHeight = designFrame.compactBrandLogoVisualHeight;
  const compactBrandCardHeight = designFrame.compactBrandCardHeight;
  const compactBrandCardsPerPage =
    compactBrandColumnsPerRow *
    (isDesktop
      ? mobileShellLayout.compactBrandDesktopRowsPerPage
      : mobileShellLayout.compactBrandMobileRowsPerPage);
  const topBrandRowsPerPage = 2;
  const compactBrandRowsPerPage = isDesktop
    ? mobileShellLayout.compactBrandDesktopRowsPerPage
    : mobileShellLayout.compactBrandMobileRowsPerPage;
  const topBrandCardHeight =
    topBrandCardWidth === designFrame.topBrandCardWidth
      ? designFrame.topBrandCardHeight
      : roundLayoutValue(topBrandCardWidth + mobileShellLayout.topBrandMetaHeight);
  const topBrandGridHeight = roundLayoutValue(
    topBrandRowsPerPage * topBrandCardHeight + (topBrandRowsPerPage - 1) * topBrandGap
  );
  const compactBrandGridHeight = roundLayoutValue(
    compactBrandRowsPerPage * compactBrandCardHeight +
      (compactBrandRowsPerPage - 1) * compactBrandGap
  );

  return {
    brandSectionFrameWidth,
    compactBrandCardHeight,
    compactBrandCardWidth,
    compactBrandCardsPerPage,
    compactBrandColumns: compactBrandColumnsPerRow,
    compactBrandGap,
    compactBrandGridHeight,
    compactBrandGroupWidth,
    compactBrandLogoVisualHeight,
    contentHorizontalPadding,
    contentMaxWidth,
    contentWidth,
    designVersion,
    isDesktop,
    mainBannerAspectRatio: mobileShellLayout.homeBannerAspectRatio,
    pageBottomPadding: isDesktop
      ? 0
      : mobileShellLayout.bottomNavClearance + 24,
    showBottomNav: !isDesktop,
    topBrandCardHeight,
    topBrandCardWidth,
    topBrandCardsPerPage: isMobileTopBrandGrid
      ? mobileShellLayout.topBrandMobilePageCardCount
      : topBrandColumnsPerRow * topBrandRowsPerPage,
    topBrandColumns: topBrandColumnsPerRow,
    topBrandDotCount: isMobileTopBrandGrid
      ? mobileShellLayout.topBrandMobileDotCount
      : mobileShellLayout.topBrandDesktopDotCount,
    topBrandGap,
    topBrandGridHeight,
    topBrandGroupWidth,
  };
}

export function getDesktopShellHorizontalPadding(viewportWidth: number) {
  if (viewportWidth >= 1200) {
    return mobileShellLayout.desktopHeaderPaddingMax;
  }

  if (viewportWidth >= mobileShellLayout.desktopBreakpoint) {
    return mobileShellLayout.desktopHeaderPaddingMin;
  }

  return roundLayoutValue(
    clampLayoutValue(
      viewportWidth * mobileShellLayout.desktopHeaderPaddingRatio,
      mobileShellLayout.contentHorizontalPadding,
      mobileShellLayout.desktopHeaderPaddingMin
    )
  );
}

export function getDesktopShellOffset(viewportWidth: number) {
  const shellContentWidth = Math.min(viewportWidth, mobileShellLayout.desktopContentMaxWidth);

  return Math.max(0, (viewportWidth - shellContentWidth) / 2);
}

/** Full-bleed footer breakout: viewport centering gap plus any inner scroll/frame padding. */
export function getDesktopFooterHorizontalPadding(viewportWidth: number, innerPadding = 0) {
  return getDesktopShellOffset(viewportWidth) + innerPadding;
}

export function getDesktopShellContentWidth(viewportWidth: number) {
  const shellContentWidth = Math.min(viewportWidth, mobileShellLayout.desktopContentMaxWidth);
  const shellPadding = getDesktopShellHorizontalPadding(viewportWidth);

  return Math.max(0, shellContentWidth - shellPadding * 2);
}

// ─── Tablet tier foundation ───────────────────────────────────────────────────
// A canonical three-way device class so screens stop branching on the binary
// `width >= desktopBreakpoint`. Tablet is the 768-1023px band.

export type DeviceClass = "mobile" | "tablet" | "desktop";

/**
 * Canonical three-way device class. Use this instead of the binary
 * `width >= desktopBreakpoint` so the 768-1023px tablet band gets first-class
 * treatment rather than falling through to the phone shell.
 */
export function getDeviceClass(viewportWidth: number): DeviceClass {
  if (viewportWidth >= mobileShellLayout.desktopBreakpoint) {
    return "desktop";
  }
  if (viewportWidth >= mobileShellLayout.tabletBreakpoint) {
    return "tablet";
  }
  return "mobile";
}

export interface TabletContentFrame {
  /** Centered column width (capped at tabletContentMaxWidth, never wider than the viewport). */
  maxWidth: number;
  /** Inner horizontal padding applied inside the column. */
  horizontalPadding: number;
  /** Gutter on each side to center the column in the viewport. */
  offset: number;
  /** Usable content width inside the column after padding. */
  contentWidth: number;
}

/**
 * Centered content frame for single-column tablet screens (forms, detail, hubs).
 * Caps the column at `tabletContentMaxWidth` and centers it so portrait-tablet
 * content reads as an intentional centered layout instead of a stretched phone.
 */
export function getTabletContentFrame(viewportWidth: number): TabletContentFrame {
  const maxWidth = Math.min(viewportWidth, mobileShellLayout.tabletContentMaxWidth);
  const horizontalPadding = mobileShellLayout.tabletContentHorizontalPadding;
  const offset = Math.max(0, (viewportWidth - maxWidth) / 2);
  const contentWidth = Math.max(0, maxWidth - horizontalPadding * 2);

  return { maxWidth, horizontalPadding, offset, contentWidth };
}

export interface CanvasFrame {
  /** Centered content width = min(viewport, fixed width for the class). */
  width: number;
  /** Gutter on each side (page background) when the viewport exceeds the fixed width. */
  offset: number;
}

/**
 * Fixed content width for the current class, clamped to the viewport. As the
 * window grows past the class's fixed width the result stays constant (only the
 * gutters grow); below it, content fills the window so it never overflows.
 */
export function getCanvasWidth(viewportWidth: number): number {
  const deviceClass = getDeviceClass(viewportWidth);
  const fixedWidth =
    deviceClass === "desktop"
      ? mobileShellLayout.canvasDesktopWidth
      : deviceClass === "tablet"
        ? mobileShellLayout.canvasTabletWidth
        : mobileShellLayout.canvasMobileWidth;

  return Math.min(viewportWidth, fixedWidth);
}

/** Centered canvas: the fixed content width plus the equal L/R gutter offset. */
export function getCanvasFrame(viewportWidth: number): CanvasFrame {
  const width = getCanvasWidth(viewportWidth);

  return { width, offset: Math.max(0, (viewportWidth - width) / 2) };
}

export const webHomeSearchPlaceholder = "Search brands, stores, products, or cashback";

// First-visit intro modal (web parity: ModalAfterLogin "Every Purchase Pays You Back.").
export const webIntroModal = {
  headingLead: "Every ",
  headingHighlight: "Purchase Pays",
  headingTail: " You Back.",
  closeLabel: "Close",
  autoDismissMs: 30000,
} as const;

export const webHomeSearchPopularPanel = {
  title: "Popular right now",
  subtitle: "Hand-picked stores with standout cashback—tap a shop to explore.",
  resultsTitle: "Matching brands & products",
  resultsSubtitle: "From your search",
  noMatches: "No brands or products match that search—browse popular picks below.",
  actionLabel: "Shop Now",
  items: [
    {
      brand: "Grocery Galaxy",
      cashback: "12.5%",
      logoBackground: "#EAF3FB",
      logoText: "GO",
      logoTextColor: "#00CC99",
    },
    {
      brand: "Pocket Pantry",
      cashback: "10.0%",
      logoBackground: "#45BDAE",
      logoText: "GO",
      logoTextColor: "#EAF3FB",
    },
    {
      brand: "Orbit Airways",
      cashback: "8.5%",
      logoBackground: "#607287",
      logoText: "◐",
      logoTextColor: "#EAF3FB",
    },
    {
      brand: "PixelPort",
      cashback: "6.5%",
      logoBackground: "#637486",
      logoText: "",
      logoTextColor: "#EAF3FB",
    },
    {
      brand: "Glow Theory",
      cashback: "14.0%",
      logoBackground: "#F3F4F6",
      logoText: "G",
      logoTextColor: "#4285F4",
    },
  ],
} as const;

export function getHomeSearchMatches(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return webHomeSearchPopularPanel.items.filter((item) =>
    [item.brand, item.cashback].some((value) => value.toLowerCase().includes(normalizedQuery))
  );
}

export const webGoLinkFeature = {
  title: "GoGoLink – Easy to earn cashback by just copy, paste and shop!",
  inputPlaceholder: "Paste your product or shop link here",
  inputLabel: "Product or shop link",
  ctaLabel: "Paste and Go",
  emptyError: "Paste a product or shop link first.",
  invalidUrlError: "Please paste a valid product or shop link.",
  resultSuccess: "Link pasted successfully!",
  demoCashbackAmount: "5.80",
  demoCashbackPercent: "(2%)",
  shopNowLabel: "Shop Now",
} as const;

export const webGoLinkModalLayout = {
  sheetMobileHeight: 464,
  toolbarHeight: 60,
  cardMarginHorizontal: 12,
  cardMobileMinHeight: 384,
  cardRadius: 24,
  illustrationMobileHeight: 160,
  inputHeight: 48,
  actionHeight: 48,
  inputActionGap: 12,
} as const;

export const webAuthPage = {
  heroAsset: "auth-login-hero",
  heroAlt: "GoGoCash — shop fun, earn cashback",
  titleByMode: {
    login: "Sign in",
    register: "Sign up",
  },
  subtitle: "Get started earning cashback",
  selectCountryLabel: "Select Country",
  countryPlaceholder: "Shopping in…",
  defaultCountry: {
    code: "TH",
    dialCode: "+66",
    flag: "🇹🇭",
    label: "Thailand",
  },
  // Selectable countries for the phone-signup dropdown (label + dial code).
  countries: [
    { code: "TH", dialCode: "+66", flag: "🇹🇭", label: "Thailand" },
    { code: "SG", dialCode: "+65", flag: "🇸🇬", label: "Singapore" },
    { code: "MY", dialCode: "+60", flag: "🇲🇾", label: "Malaysia" },
    { code: "ID", dialCode: "+62", flag: "🇮🇩", label: "Indonesia" },
    { code: "PH", dialCode: "+63", flag: "🇵🇭", label: "Philippines" },
    { code: "VN", dialCode: "+84", flag: "🇻🇳", label: "Vietnam" },
    { code: "TW", dialCode: "+886", flag: "🇹🇼", label: "Taiwan" },
    { code: "JP", dialCode: "+81", flag: "🇯🇵", label: "Japan" },
    { code: "CN", dialCode: "+86", flag: "🇨🇳", label: "China" },
  ],
  phoneLabelByMode: {
    login: "Sign in with Phone Number",
    register: "Sign up with Phone Number",
  },
  phonePlaceholder: "Phone Number",
  privacyLead: "I have read and understand",
  privacyPolicyLabel: "Privacy Policy",
  socialDividerByMode: {
    login: "or sign in with",
    register: "or sign up with",
  },
  otp: {
    changeNumber: "Change phone number",
    errorAria:
      "The verification code is incorrect. Update the digits or use Resend to request a new code.",
    intro:
      "A verification code will be sent to your mobile number to confirm this action is being performed by you.",
    label: "Verification code",
    next: "Next",
    resend: "Resend ?",
    sentTo: "Code is sent to phone number :",
  },
  socialProviders: [
    { id: "facebook", label: "Facebook" },
    { id: "google", label: "Gmail" },
    { id: "telegram", label: "Telegram" },
    { id: "apple", label: "Apple" },
    { id: "x", label: "X" },
    { id: "microsoft", label: "Microsoft" },
    { id: "wallet", label: "Connect Wallet" },
  ],
  desktop: {
    cardHeight: 690,
    contentGap: 126,
    formCardWidth: 600,
    heroWidth: 588,
    maxWidth: 1440,
  },
} as const;

export const webLinkMyCashbackIntro = {
  backgroundColor: "#F6F6F6",
  title: "Sign in",
  subtitle: "Manage your activities in one centralized account",
  goGoCashImageLabel: "GoGoCash",
  myCashbackImageAlt: "MyCashBack",
  cardTitle: "Link MyCashback with GoGoCash",
  cardDescription:
    "For MyCashBack users, you may link all of the accounts to your GoGoCash profile here to manage your balances and activities from one centralized location.",
  skipLabel: "Skip",
  linkAccountLabel: "Link Account",
  connectorDots: ["#5E8F9C", "#3BAFAA", "#55D5CE", "#83F2D6"],
} as const;

export const webAccountSetupFlow = {
  title: "Account Setup",
  subtitle: "Shopping smoother by getting your withdrawal method ready",
  heroAlt: "GoGoCash account setup hero",
  promptPay: {
    primary: "Prompt",
    secondary: "Pay",
    thai: "พร้อมเพย์",
  },
  registeredPhone: "0891234567",
  registeredName: "Mock User",
  sectionTitle: "Setup PromptPay as Withdrawal Method",
  sectionDescription:
    "This setup is your default withdrawal method for a faster start. You can add more accounts or switch payment methods whenever you make a withdrawal.",
  options: {
    registeredPhone: "Use This Phone Number : {tail}",
    registeredPhoneUnavailable: "Use registered phone number (not on file)",
    otherPhone: "Change to other Phone Numbers",
    citizenId: "Use Citizen ID",
  },
  actions: {
    notNow: "Not Now",
    next: "Next",
    saving: "Saving...",
    confirm: "Confirm",
    back: "Back",
    divider: "or setup withdrawal method with",
    bank: "Bank Account",
    crypto: "Crypto Wallet",
  },
  status: {
    submitSuccess: "PromptPay saved as your default withdrawal method.",
    noRegisteredPhone: "No phone number on file. Please choose another option.",
  },
  steps: {
    otherPhone: {
      title: "Enter the phone number to use",
      description: "We'll send a one-time code to this number to verify it's yours.",
      placeholder: "e.g. 0812345678",
      ariaLabel: "Phone number",
      invalid: "Please enter a valid 10-digit Thai mobile number.",
    },
    otp: {
      title: "Enter the verification code",
      description: "We sent a 6-digit code to {tail}. Enter it below.",
      placeholder: "123456",
      ariaLabel: "Verification code",
      invalid: "Wrong code. Please check your messages and try again.",
    },
    citizenId: {
      title: "Enter your Citizen ID",
      description: "Use the 13-digit number on your Thai national ID card.",
      placeholder: "13-digit Citizen ID",
      ariaLabel: "Citizen ID number",
      invalid: "Please enter a valid 13-digit Citizen ID.",
    },
    name: {
      title: "Enter your name to confirm the transfer",
      description: "This must match the name registered on your PromptPay account.",
      firstNamePlaceholder: "First name",
      firstNameAriaLabel: "First name",
      lastNamePlaceholder: "Last name",
      lastNameAriaLabel: "Last name",
      required: "This field is required.",
    },
  },
  desktop: {
    cardHeight: 690,
    contentGap: 126,
    formCardWidth: 600,
    heroWidth: 588,
    maxWidth: 1440,
  },
} as const;

export const webAccountPageSurface = {
  titleColor: "#103522",
  cardRadius: 24,
  railWidth: 320,
  contentMaxWidth: 1080,
  desktopContentMaxWidth: 1180,
  surfaceBorderColor: "#E4E4E4",
  shellBackground: "#F6F6F6",
} as const;

/**
 * Horizontal width frame for the account/profile shell (AccountPageShell).
 *
 * `alignToNavbarShell` pages (the profile rail / account-section surfaces) reuse the
 * desktop header's column cap (mobileShellLayout.desktopContentMaxWidth) and gutter
 * (getDesktopShellHorizontalPadding) so the user-section card's left edge meets the
 * navbar logo and its right edge meets the globe — the same rule the home page uses
 * in getResponsiveHomeLayoutMetrics. Non-rail desktop pages (e.g. Quest, whose hero
 * and grid are sized from webAccountPageSurface.desktopContentMaxWidth) keep the
 * legacy 1180/16 frame. Below the desktop breakpoint both use the full-bleed mobile
 * content width.
 */
export function getAccountShellFrameMetrics(
  viewportWidth: number,
  options: { alignToNavbarShell?: boolean; tabletFluid?: boolean } = {}
): { maxWidth: number; paddingHorizontal: number } {
  const deviceClass = getDeviceClass(viewportWidth);

  if (deviceClass === "mobile") {
    return {
      maxWidth: mobileShellLayout.contentMaxWidth,
      paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
    };
  }

  // Tablet (768-1023): cap + center single-column shell content so it reads as an
  // intentional centered layout instead of a stretched phone. Grid screens whose
  // content is sized from the raw viewport width (e.g. Quest) opt out via
  // `tabletFluid` to keep the full-bleed frame their grid math expects.
  if (deviceClass === "tablet") {
    if (options.tabletFluid) {
      return {
        maxWidth: mobileShellLayout.contentMaxWidth,
        paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
      };
    }
    return {
      maxWidth: mobileShellLayout.tabletContentMaxWidth,
      paddingHorizontal: mobileShellLayout.tabletContentHorizontalPadding,
    };
  }

  if (options.alignToNavbarShell) {
    return {
      maxWidth: mobileShellLayout.desktopContentMaxWidth,
      paddingHorizontal: getDesktopShellHorizontalPadding(viewportWidth),
    };
  }

  return {
    maxWidth: webAccountPageSurface.desktopContentMaxWidth,
    paddingHorizontal: mobileShellLayout.desktopContentHorizontalPadding,
  };
}

/**
 * Horizontal offset the AccountPageShell must pass to its desktop footer slot.
 *
 * Rail pages render the same full-bleed footer as the homepage, but inside the
 * account shell's centered frame. CustomerDesktopFooter sets
 * `marginLeft: -horizontalPadding` + `width: viewportWidth` and centers its inner
 * content. But it lives inside the shell's centered, horizontally-padded frame, so
 * without compensation it starts at the padded content edge and overflows to the
 * right (clipping the last footer column / social icon). Offsetting by the frame's
 * centering gap plus its content padding pulls the footer back to the viewport edge
 * so its centered content lines up with the page content above it. Quest/non-rail
 * desktop pages do not use this helper; AccountPageShell renders their footer in
 * the same full-width page structure as the homepage and uses getDesktopShellOffset.
 *
 * Mobile hides the footer (CustomerDesktopFooterSlot returns null below the desktop
 * breakpoint), so no offset is needed there.
 */
export function getAccountShellFooterHorizontalPadding(
  viewportWidth: number,
  options: { alignToNavbarShell?: boolean } = {}
): number {
  if (viewportWidth < mobileShellLayout.desktopBreakpoint || !options.alignToNavbarShell) {
    return 0;
  }

  const { maxWidth, paddingHorizontal } = getAccountShellFrameMetrics(viewportWidth, options);
  const frameOffset = Math.max(0, (viewportWidth - maxWidth) / 2);

  return roundLayoutValue(frameOffset + paddingHorizontal);
}

export const webWalletTransactionTabs = [
  "All Transactions",
  "Earning Transactions",
  "Withdraw Transactions",
] as const;

export const webWalletSupportBanner = {
  line1: "Report if your cashback wasn't tracked or added after a purchase.",
  line2: "Our team will review it for you.",
  title: "Contact Support",
  subtitle: "LINE Official Account",
} as const;

export const webWalletAccessibleSummary =
  "Wallet — Cashback Summary Total Cashback Available: 3,180.24. Last Updated: 28 Mar 2026 07:00.";

export const webWalletCashbackSummary = {
  title: "Cashback Summary",
  subtitle:
    "A simple snapshot of your rewards — what we’re tracking, what’s still confirming, and what you’ve already received.",
  metrics: [
    {
      label: "Total Cashback",
      hint: "Every purchase we’re tracking for cashback, all in one place.",
      amount: "3,504.60",
      currency: "THB",
      primary: true,
    },
    {
      label: "Pending Cashback",
      hint: "Usually updates after the store confirms your order.",
      amount: "633.60",
      currency: "THB",
      primary: false,
    },
    {
      label: "Withdrawn",
      hint: "Already sent to your bank or crypto wallet.",
      amount: "0.00",
      currency: "THB",
      primary: false,
    },
  ],
} as const;

export const webWalletSummaryMetrics = [
  {
    label: "Total Cashback",
    hint: "A simple snapshot of your rewards.",
    amount: "0.00",
    currency: "USD",
  },
  {
    label: "Pending Cashback",
    hint: "Rewards that are still confirming.",
    amount: "0.00",
    currency: "USD",
  },
  {
    label: "Withdrawn",
    hint: "Cashback already paid out.",
    amount: "0.00",
    currency: "USD",
  },
] as const;

export const webWalletEmptyState = {
  title: "It's been a while since your last wallet visit.",
  subtitle: "Let's go shopping and save cash on every spend!",
} as const;

export const webQuestTabs = [
  { label: "How to win!", id: "how-to-win" },
  { label: "Tasks", id: "tasks" },
  { label: "Leaderboard", id: "leaderboard", icon: "champ" },
] as const;

export const webQuestAssets = {
  banner: "quest/banner_en.png",
  howToEarn: "quest/how_to_earn_en.png",
  promo: "quest/banner2.png",
} as const;

export const webQuestTaskRows = [
  { title: "Watch Ads", points: "+10 Points", icon: "watchAds" },
  { title: "Grocery Galaxy", points: "+0 Points", icon: "go", logoText: "GO" },
  { title: "Pocket Pantry", points: "+0 Points", icon: "go", logoText: "GO" },
  { title: "Orbit Airways", points: "+0 Points", icon: "orbit" },
  { title: "PixelPort", points: "+0 Points", icon: "pixel" },
  { title: "Glow Theory", points: "+0 Points", icon: "glow", logoText: "G" },
] as const;

export const webQuestLeaderboardRows = [
  { name: "Sta...ter", points: "2,100", rank: 1 },
  { name: "Lun...int", points: "1,840", rank: 2 },
  { name: "Que...Kid", points: "1,590", rank: 3 },
  { name: "Neo...hop", points: "720", rank: 4 },
  { name: "Cash...fan", points: "680", rank: 5 },
] as const;

export const webQuestMyRank = {
  rankLabel: "My Rank",
  rankValue: "12th",
  pointsLabel: "My Total Points",
  pointsValue: "1,250",
  viewPointsLabel: "View Points",
  spendingLabel: "Your Spending",
  spendingValue: "950",
  specialTasksLabel: "Your Special Tasks",
  specialTasksValue: "300",
} as const;

export const webProfileSectionOrder = [
  "profileTitle",
  "walletSummaryHeroCard",
  "profileNavigationPanel",
  "logoutAction",
] as const;

export const webProfileWalletSummary = {
  username: "Mock User",
  userId: "mock-user-0001",
  maskedId: "***0001",
  amount: "3,180.24",
  currency: "THB",
  lastUpdated: "Last Updated: 28 Mar 2026 07:00",
  // Non-subscriber default — badge/avatar ring only render for live `membership_tier`.
  membershipTier: "starter",
} as const;

export const webProfileWalletHeroSurface = {
  sourceAsset: "profile/back_wallet.svg",
  headerColor: "#00AA80",
  assetBaseColor: "#5D87FF",
  outerColor: "#8ADBAE",
  glassFallbackColor: "#BFEAF0",
  glassBorderColor: "rgba(255, 255, 255, 0.4)",
  glassBackgroundImage:
    "radial-gradient(circle at 67% 82%, rgba(138, 219, 174, 0.72) 0%, rgba(138, 219, 174, 0.52) 28%, rgba(138, 219, 174, 0) 62%), radial-gradient(ellipse at 15% 92%, rgba(230, 247, 237, 0.78) 0%, rgba(230, 247, 237, 0.48) 34%, rgba(230, 247, 237, 0) 68%), radial-gradient(circle at 94% -8%, rgba(84, 203, 137, 0.38) 0%, rgba(84, 203, 137, 0) 56%), linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.14)), linear-gradient(90deg, #8FC4F2 0%, #BFEAF0 48%, #B6E8D4 100%)",
} as const;

export const webProfileInfoCashbackCard = {
  title: "Total Cashback",
  actionLabel: "Withdraw",
  hint: "See your withdrawable total and how it splits by source.",
  availableLabel: "AVAILABLE TO WITHDRAW",
  amount: "3,180.24",
  currency: "THB",
  breakdownTitle: "BALANCE BREAKDOWN",
  rows: [
    { label: "Linked My Cashback", subtitle: "My Cashback Balance", amount: "675.00" },
    { label: "GoGoCash balance", subtitle: "GoGoCash", amount: "2,505.24" },
  ],
} as const;

export const webCreditScorePage = {
  title: "My Rating Score",
  heroLabel: "Your GoGoPass Score",
  score: 40,
  scoreEmoji: "⭐",
  tier: "Starter",
  trustedTier: "Trusted",
  pointsToTrusted: "40 more points to Trusted 💜",
  progressTitle: "⭐ Starter — 💜 Trusted",
  progressLabel: "40 / 80 pts",
  breakdownTitle: "Earn more points",
  completeSectionLabel: "Complete",
  todoSectionLabel: "Still to do",
  completeRows: [
    { label: "Email verified", points: "+20 pts" },
    { label: "Phone verified", points: "+20 pts" },
  ],
  todoRows: [
    {
      label: "Monthly spend ≥ ฿3,000",
      subLabel: "฿0 this month",
      points: "+40 pts",
      cta: "Start earning →",
    },
    {
      label: "10+ transactions",
      subLabel: "0 transactions this month",
      points: "+20 pts",
      cta: "Start earning →",
    },
    { label: "Profile complete", points: "+20 pts", cta: "Complete profile →" },
  ],
  benefitsTitle: "What you get",
  activeBenefitsLabel: "Your active benefits",
  lockedBenefitsLabel: "Unlock at Trusted 💜",
  comingSoonLabel: "Coming soon",
  activeBenefits: [
    { icon: "💰", label: "Cashback on every purchase", status: "Active" },
    { icon: "📦", label: "Standard payout (2–5 days)", status: "Active" },
    { icon: "🎯", label: "Access to all GoGo Quests", status: "Active" },
  ],
  lockedBenefits: [
    { icon: "🎧", label: "Priority customer support" },
    { icon: "🎯", label: "Access to Exclusive Quests" },
    {
      icon: "👑",
      label: "Free GoGoPass for 12 months",
      note: "Unlock when you stay Trusted for 3 consecutive months",
    },
  ],
  comingBenefits: [{ icon: "💳", label: "Micro-credit access", status: "Coming 2027" }],
  streakTitle: "Free GoGoPass — 12 Months",
  streakSubtitle: "Stay Trusted 3 months in a row",
  boostTitle: "You're 40 points from Trusted!",
  boostBody: "Spend ฿3,000, complete 10 transactions, and verify your details to level up.",
  boostCta: "Start earning →",
} as const;

export const profileInviteUrl = "https://gogocash.co/ref/mock-user-001";

export const webReferralPage = {
  title: "Referral",
  hero: {
    imageAsset: "referral-hero-banner",
    alt: "Invite friends to GOGOCASH & get a 20 THB bonus! Share your link or referral code below and enjoy your bonus instantly",
  },
  earn: {
    title: "Refer & Earn",
    subtitle: "For each friend that you invite",
    shareTitle: "Share your referral link",
    inviteLinkLabel: "invite link",
    // Mirrors the web's formatInviteLinkDisplay(url, 22, 14) output for a referral
    // URL ({origin}/?referral_id=...) — production domain + middle "…" truncation,
    // not a dev localhost host.
    displayLink: "https://gogocash.co/?r…f86cd799439011",
    socialTitle: "Share referral link on social media",
    socialLinks: [
      { id: "facebook", label: "Facebook", color: "#1877F2" },
      { id: "linkedin", label: "LinkedIn", color: "#0A66C2" },
      { id: "instagram", label: "Instagram", color: "#E4405F" },
      { id: "x", label: "X", color: "#0F1419" },
    ],
  },
  invitation: {
    title: "Invitation",
    tabs: ["All Invitations", "Created Account", "Shopped with Us"],
    columns: ["Date", "User", "Point", "Status"],
    rows: [{ date: "3/28/2026", user: "FriendInvite", point: "120 pts", status: "Success" }],
  },
  steps: {
    title: "Share with Friends and Get Rewards",
    kicker: "Step-by-Step:",
    imageAsset: "referral-step-banner",
    alt: "Step-by-Step: Share with Friends and Get Rewards. Copy your unique referral link. Share it with your friends via chat, email, or social media. You both earn 20 THB!",
    bullets: [
      "Copy your unique referral link.",
      "Share it with your friends via chat, email, or social media.",
      "You both earn 20 THB!",
    ],
  },
  faq: {
    title: "Refer Friends FAQs",
    items: [
      {
        question: "Exclusions",
        answer:
          "Referral rewards may not apply when a purchase uses excluded payment methods, stacks with certain third-party offers, or is marked ineligible by the merchant. Standard cashback exclusions on the brand offer page still apply.",
      },
      {
        question: "Refunds, Cancellations, & no-shows",
        answer:
          "If a referred friend's qualifying purchase is refunded or reversed, related referral rewards may be adjusted or removed according to the program rules.",
      },
      {
        question: "Tracking Disclaimers",
        answer:
          "Invites are attributed when friends sign up and shop using your referral link. It may take a short time after purchase for activity to appear here.",
      },
      {
        question: "Other terms and conditions",
        answer:
          "Reward amounts, eligibility, and rules may change over time. Continued use of the referral program means you accept the current terms. See our help center or terms of service for full details.",
      },
    ],
  },
} as const;

// Profile hero parity with the web `CardProfile`
// (src/features/profile/component/CardProfile.tsx): name + GOGOPASS badge, a
// "User ID" row + copy, and a mint "invite link" chip + copy. The web derives the
// 9-digit id from the session via `nineDigitUserIdDisplay`; here we keep a fixed
// mock display value (visual parity with mock data, per the plan). The invite-link
// value reuses `webReferralPage.earn.displayLink` so the hero and the referral
// page can't drift.
export const webProfileHeroCard = {
  userIdLabel: "User ID",
  // Mock 9-digit display id (mirrors the web `nineDigitUserIdDisplay` output shape).
  userId: "204815963",
  userIdRevealAria: "Show User ID",
  userIdHideAria: "Hide User ID",
  userIdCopyAria: "Copy User ID",
  userIdCopiedToast: "User ID copied",
  inviteLinkLabel: "invite link",
  inviteLink: webReferralPage.earn.displayLink,
  inviteLinkCopyAria: "Copy invite link",
  inviteLinkCopiedToast: "Invite link copied",
  copyFailedToast: toastErrorMessages.copyFailed,
} as const;

export const webMembershipLanding = {
  savings: {
    heading: "Annual saves you real money",
    subtitle: "Simple math in THB — no hidden FX.",
    monthlyLine: "12 × ฿49 monthly",
    monthlyValue: "฿588",
    annualLine: "Annual plan",
    annualValue: "฿490",
    youSaveLabel: "You save",
    youSaveValue: "฿98 (~16%)",
    footnote: "That is ฿98 less than paying month-by-month — about 16% off.",
  },
  socialProof: {
    heading: "Built for real shopping in Thailand",
    subtitle: "Straightforward pricing and partners you already use.",
    stats: [
      { value: "220+", caption: "partner brands where your membership and rewards count" },
      { value: "16%", caption: "typical savings when you pick annual vs twelve monthly payments" },
      { value: "฿49", caption: "per month on the flexible monthly plan" },
    ],
  },
} as const;

export const webPrivacyPolicyPage = {
  title: "Privacy Policy",
  articleLabel: "Privacy Policy",
  legalArticleMaxWidth: 800,
  effectiveDate: "Effective Date: 1 April 2026",
  lastUpdated: "Last Updated: 1 April 2026",
  openingCompany: "GOGO HOLDING (THAILAND) Company Limited",
  intentIntro: "This Privacy Policy is intended to help you understand:",
  firstSectionTitle: "1. Who We Are",
} as const;

export const webBrowseShortcuts = [
  { id: "all-brands", label: "All Brands", href: "/brand", icon: "shop" },
  { id: "all-shops", label: "All Shops", href: "/shops", icon: "shops" },
  {
    id: "product-discover",
    label: "Product Discovery",
    href: "/discover",
    icon: "promotion",
  },
  { id: "categories", label: "Categories", href: "/category", icon: "education" },
] as const;

export const webDesktopHeaderNavItems = [
  {
    id: "top-brands",
    label: "Top Brands",
    href: "/",
    icon: "none",
    active: true,
    showFire: true,
  },
  {
    id: "all-brands",
    label: "All Brands",
    href: "/brand",
    icon: "shop",
    active: false,
    showFire: false,
  },
  {
    id: "all-shops",
    label: "All Shops",
    href: "/shops",
    icon: "shops",
    active: false,
    showFire: false,
  },
  {
    id: "product-discovery",
    label: "Product Discovery",
    href: "/discover",
    icon: "promotion",
    active: false,
    showFire: false,
    menuTypography: "lead",
  },
  {
    id: "travel",
    label: "Travel",
    href: "/category/Travel",
    icon: "travel",
    active: false,
    showFire: false,
  },
  {
    id: "electronics",
    label: "Electronics",
    href: "/category/Electronics",
    icon: "electronics",
    active: false,
    showFire: false,
    menuTypography: "lead",
  },
  {
    id: "health-beauty",
    label: "Health & Beauty",
    href: "/category/Health%20%26%20Beauty",
    icon: "health",
    active: false,
    showFire: false,
    menuTypography: "lead",
  },
] as const;

export const webLocaleRegionPanel = {
  ariaLabel: "Choose language and region",
  defaultLanguage: "en",
  defaultRegion: "TH",
  sections: {
    language: "LANGUAGE",
    region: "REGION",
  },
  languages: [
    { code: "en", flag: "🇬🇧", label: "English" },
    { code: "th", flag: "🇹🇭", label: "ไทย" },
  ],
  regions: [
    { code: "TH", flag: "🇹🇭", label: "Thailand" },
    { code: "TW", flag: "🇹🇼", label: "Taiwan" },
    { code: "CN", flag: "🇨🇳", label: "China" },
    { code: "JP", flag: "🇯🇵", label: "Japan" },
    { code: "SG", flag: "🇸🇬", label: "Singapore" },
    { code: "MY", flag: "🇲🇾", label: "Malaysia" },
    { code: "ID", flag: "🇮🇩", label: "Indonesia" },
    { code: "PH", flag: "🇵🇭", label: "Philippines" },
    { code: "VN", flag: "🇻🇳", label: "Vietnam" },
    { code: "SEA", flag: "🌏", label: "Southeast Asia" },
  ],
} as const;

export const webCookieConsentBanner = {
  title: "We use cookies in the delivery of our services.",
  bodyPart1: "To learn about the cookies we use and your preferences, read our ",
  privacyPolicyLabel: "Privacy Policy",
  bodyPart2: ". By using GoGoCash you agree to our use of cookies for cashback and analytics.",
  decline: "Cookie settings",
  allow: "Accept all cookies",
  dismissedStorageKey: "pdpa_consent_banner_dismissed_v1",
  dismissedEventName: "gc:consent-banner-dismissed",
  openEventName: "gc:open-consent-banner",
} as const;

export const webLineOfficialFab = {
  href: "https://lin.ee/7om5sAr",
  label: "LINE Official Account",
} as const;

export const webDesktopFooter = {
  logoLabel: "GoGoCash",
  copyrightTemplate: "© {year} Copyright - Made with 💚 by GoGoCash",
  disclaimer:
    "Cashback rates, merchant availability, and product features may change. GoGoCash does not provide financial, investment, or tax advice. Saving Plus and related offerings involve risk; read terms before participating. Past performance is not indicative of future results.",
  cloudflare: {
    label: "Secured by",
    href: "https://www.cloudflare.com",
    asset: "cloudflare-logo",
  },
  sections: [
    {
      title: "Live on Platform",
      items: [
        { label: "Website", href: "https://app.gogocash.co", external: true },
        { label: "Telegram Mini App", href: "https://t.me/GoGoCashAppBot", external: true },
        {
          label: "Line Mini App",
          href: "https://miniapp.line.me/2008237918-mpplkp5Q",
          external: true,
        },
      ],
    },
    {
      title: "Products",
      items: [
        { label: "Business Inquiries", href: "https://lin.ee/7om5sAr", external: true },
        { label: "Careers", href: "https://lin.ee/7om5sAr", external: true },
      ],
    },
    {
      title: "Resources",
      items: [
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Terms of Use", href: "https://gogocash.co/term-of-use", external: true },
        {
          label: "Terms of Service",
          href: "https://gogocash.co/terms-of-service",
          external: true,
        },
        {
          label: "How GoGoCash Makes Money",
          href: "https://gogocash.co/how-gogocash-makes-money",
          external: true,
        },
        { label: "Learn", href: "https://gogocash.co/learn", external: true },
        { label: "System Status", href: "https://status.gogocash.co/", external: true },
        {
          label: "Cookie Settings",
          href: "https://gogocash.co/privacy-policy",
          external: true,
        },
      ],
    },
  ],
  socialLinks: [
    { label: "X", href: "https://x.com/mygogocash", icon: "X" },
    { label: "Discord", href: "https://discord.gg/T9aydr2yFd", icon: "Discord" },
    {
      label: "Telegram",
      href: "https://t.me/GoGoCashOfficialChannel",
      icon: "Telegram",
    },
    { label: "Line", href: "https://lin.ee/7om5sAr", icon: "Line" },
    { label: "Threads", href: "https://www.threads.com/@mygogocash", icon: "Threads" },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/gogocash",
      icon: "LinkedIn",
    },
    { label: "GitHub", href: "https://github.com/mygogocash", icon: "GitHub" },
    { label: "YouTube", href: "https://www.youtube.com/@mygogocash", icon: "YouTube" },
  ],
} as const;

export const webCategoryDirectory = {
  title: "Categories",
  titleIcon: "📂",
  countLabel: "5 categories available",
  searchPlaceholder: "Find a category",
  cardEyebrow: "Category",
  cardCta: "Browse this collection",
  emptyTitle: "No categories match that search.",
  emptyBody: "Try another category name.",
  pagination: {
    pageSize: 16,
  },
  cards: [
    { title: "Travel", href: "/category/Travel", imageAsset: "quest-banner-en" },
    { title: "Electronics", href: "/category/Electronics", imageAsset: "popular-electronic" },
    { title: "Beauty", href: "/category/Beauty", imageAsset: "popular-beauty" },
    {
      title: "Health & Beauty",
      href: "/category/Health%20&%20Beauty",
      imageAsset: "popular-beauty",
    },
    { title: "Others", href: "/category/Others", imageAsset: "popular-dinner" },
  ],
} as const;

export function getCategoryDirectoryMatches(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [...webCategoryDirectory.cards];
  }

  return webCategoryDirectory.cards.filter((category) =>
    category.title.toLowerCase().includes(normalizedQuery)
  );
}

export function getCategoryDirectoryCountLabel(count: number) {
  return `${count} ${count === 1 ? "category" : "categories"} available`;
}

export function getCategoryDirectoryPage(query: string = "", page: number = 1) {
  const matches = getCategoryDirectoryMatches(query);
  const pageSize = webCategoryDirectory.pagination.pageSize;
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const activePage = Math.min(Math.max(1, page), totalPages);

  return {
    activePage,
    cards: matches.slice((activePage - 1) * pageSize, activePage * pageSize),
    totalPages,
    totalResults: matches.length,
  };
}

export function getCategoryDirectoryGridMetrics({
  contentWidth,
  viewportWidth,
}: {
  contentWidth: number;
  viewportWidth: number;
}) {
  const columns =
    viewportWidth >= 1280 ? 4 : viewportWidth >= 768 ? 4 : viewportWidth >= 640 ? 3 : 2;
  const gap = 16;
  const cardWidth = roundLayoutValue((contentWidth - gap * Math.max(0, columns - 1)) / columns);

  return {
    cardWidth,
    columns,
    gap,
  };
}

export const webHomeHeroBanners = [
  {
    id: "main-grocery-galaxy",
    asset: "home-promo-black-friday",
    href: "/shop/brand-grocery-galaxy-1001",
    placement: "main",
  },
  {
    id: "main-pocket-pantry",
    asset: "home-promo-holiday",
    href: "/shop/brand-pocket-pantry-1002",
    placement: "main",
  },
  {
    id: "main-orbit-airways",
    asset: "home-promo-fashion",
    href: "/shop/brand-orbit-airways-1003",
    placement: "main",
  },
  {
    id: "side-pixelport",
    asset: "home-promo-holiday",
    href: "/shop/brand-pixelport-1004",
    placement: "side",
  },
  {
    id: "side-bloom-beam",
    asset: "home-promo-fashion",
    href: "/shop/brand-bloom-beam-1006",
    placement: "side",
  },
] as const;

export const webMobileBottomNavItems = [
  { label: "Home", href: "/", icon: "home" },
  { label: "GoGoLink", href: "/golink", icon: "golink" },
  { label: "Wallet", href: "/wallet", icon: "wallet", emphasized: true },
  { label: "Quest", href: "/quest", icon: "quest" },
  { label: "Profile", href: "/profile", icon: "profile" },
] as const;

export const webTopBrandCards = [
  {
    brand: "Grocery Galaxy",
    cashback: "12.5%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/instacart",
    showGrabCoupon: true,
    tint: "#6366F1",
  },
  {
    brand: "Pocket Pantry",
    cashback: "10.0%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/instacart",
    showGrabCoupon: true,
    tint: "#6366F1",
  },
  {
    brand: "Orbit Airways",
    cashback: "8.5%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/americanairlines",
    showGrabCoupon: false,
    tint: "#2563EB",
  },
  {
    brand: "PixelPort",
    cashback: "6.5%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/apple",
    showGrabCoupon: false,
    tint: "#2563EB",
  },
  {
    brand: "Glow Theory",
    cashback: "14.0%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/shopify",
    showGrabCoupon: true,
    tint: "#6366F1",
  },
  {
    brand: "Bloom & Beam",
    cashback: "15.0%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/nike",
    showGrabCoupon: true,
    tint: "#7F1D1D",
  },
  {
    brand: "Urban Checkout",
    cashback: "11.0%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/shopify",
    showGrabCoupon: true,
    tint: "#0F766E",
  },
  {
    brand: "Nova Travel Club",
    cashback: "9.2%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/tripadvisor",
    showGrabCoupon: false,
    tint: "#1D4ED8",
  },
  {
    brand: "Circuit Nest",
    cashback: "7.0%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/samsung",
    showGrabCoupon: false,
    tint: "#2563EB",
  },
  {
    brand: "Mint Mirror",
    cashback: "16.5%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/target",
    showGrabCoupon: true,
    tint: "#0EA5E9",
  },
  {
    brand: "Daily Harvest Box",
    cashback: "9.8%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/apple",
    showGrabCoupon: true,
    tint: "#2563EB",
  },
  {
    brand: "Sound Loft",
    cashback: "5.8%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/spotify",
    showGrabCoupon: false,
    tint: "#0F766E",
  },
  {
    brand: "Silk Society",
    cashback: "13.2%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/x",
    showGrabCoupon: true,
    tint: "#9F1239",
  },
  {
    brand: "Horizon Escapes",
    cashback: "8.8%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/meta",
    showGrabCoupon: false,
    tint: "#1F3E5F",
  },
  {
    brand: "Gadget Grove",
    cashback: "7.5%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/android",
    showGrabCoupon: false,
    tint: "#2563EB",
  },
  {
    brand: "Pure Ritual",
    cashback: "18.0%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/shopee",
    showGrabCoupon: true,
    tint: "#0F766E",
  },
  {
    brand: "Luxe Lane Beauty",
    cashback: "17.2%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/shopify",
    showGrabCoupon: true,
    tint: "#F97316",
  },
  {
    brand: "CloudNine Travel",
    cashback: "10.3%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/tripadvisor",
    showGrabCoupon: false,
    tint: "#EAB308",
  },
  {
    brand: "Volt Market",
    cashback: "6.9%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/apple",
    showGrabCoupon: false,
    tint: "#2563EB",
  },
  {
    brand: "Cozy Cart",
    cashback: "9.1%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/instacart",
    showGrabCoupon: true,
    tint: "#0F9F6E",
  },
  {
    brand: "Radiant Lab",
    cashback: "12.9%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/nike",
    showGrabCoupon: true,
    tint: "#7F1D1D",
  },
  {
    brand: "StayMint Hotels",
    cashback: "11.4%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/airbnb",
    showGrabCoupon: false,
    tint: "#0EA5E9",
  },
  {
    brand: "Echo Devices",
    cashback: "6.1%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/samsung",
    showGrabCoupon: false,
    tint: "#2563EB",
  },
  {
    brand: "Fresh Basket",
    cashback: "10.8%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/instacart",
    showGrabCoupon: true,
    tint: "#0F9F6E",
  },
  {
    brand: "Amber Apothecary",
    cashback: "14.4%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/target",
    showGrabCoupon: true,
    tint: "#7F1D1D",
  },
  {
    brand: "Trailhead Outfitters",
    cashback: "9.6%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/tripadvisor",
    showGrabCoupon: false,
    tint: "#0F766E",
  },
  {
    brand: "Nimbus Tech",
    cashback: "7.3%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/android",
    showGrabCoupon: false,
    tint: "#2563EB",
  },
  {
    brand: "Harvest & Hearth",
    cashback: "11.2%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/apple",
    showGrabCoupon: true,
    tint: "#0F9F6E",
  },
  {
    brand: "Velvet Vanity",
    cashback: "13.6%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/target",
    showGrabCoupon: true,
    tint: "#9F1239",
  },
  {
    brand: "Skyline Suites",
    cashback: "12.1%",
    label: "Grab Coupon",
    logoUri: "https://cdn.simpleicons.org/airbnb",
    showGrabCoupon: false,
    tint: "#0E7490",
  },
] as const;

export const webTopBrandHrefs = {
  "Grocery Galaxy": "/shop/brand-grocery-galaxy-1001",
  "Pocket Pantry": "/shop/brand-pocket-pantry-1002",
  "Orbit Airways": "/shop/brand-orbit-airways-1003",
  PixelPort: "/shop/brand-pixelport-1004",
  "Glow Theory": "/shop/brand-glow-theory-1005",
  "Bloom & Beam": "/shop/brand-bloom-beam-1006",
  "Urban Checkout": "/shop/brand-urban-checkout-1007",
  "Nova Travel Club": "/shop/brand-nova-travel-club-1008",
  "Circuit Nest": "/shop/brand-circuit-nest-1009",
  "Mint Mirror": "/shop/brand-mint-mirror-1010",
  "Daily Harvest Box": "/shop/brand-daily-harvest-box-1011",
  "Sound Loft": "/shop/brand-sound-loft-1012",
  "Silk Society": "/shop/brand-silk-society-1013",
  "Horizon Escapes": "/shop/brand-horizon-escapes-1014",
  "Gadget Grove": "/shop/brand-gadget-grove-1015",
  "Pure Ritual": "/shop/brand-pure-ritual-1016",
  "Luxe Lane Beauty": "/shop/brand-luxe-lane-beauty-1017",
  "CloudNine Travel": "/shop/brand-cloudnine-travel-1018",
  "Volt Market": "/shop/brand-volt-market-1019",
  "Cozy Cart": "/shop/brand-cozy-cart-1020",
  "Radiant Lab": "/shop/brand-radiant-lab-1021",
  "StayMint Hotels": "/shop/brand-staymint-hotels-1022",
  "Echo Devices": "/shop/brand-echo-devices-1023",
  "Fresh Basket": "/shop/brand-fresh-basket-1024",
  "Amber Apothecary": "/shop/brand-amber-apothecary-1025",
  "Trailhead Outfitters": "/shop/brand-trailhead-outfitters-1026",
  "Nimbus Tech": "/shop/brand-nimbus-tech-1027",
  "Harvest & Hearth": "/shop/brand-harvest-hearth-1028",
  "Velvet Vanity": "/shop/brand-velvet-vanity-1029",
  "Skyline Suites": "/shop/brand-skyward-suites-1030",
  "Skyward Suites": "/shop/brand-skyward-suites-1030",
  "Pearl Polish": "/shop/brand-pearl-polish-1037",
  "Coastal Commute": "/shop/brand-coastal-commute-1034",
  "Alpine Air Pass": "/shop/brand-alpine-air-pass-1038",
  "Voyage Parade": "/shop/brand-voyage-parade-1041",
  "Driftline Cruises": "/shop/brand-driftline-cruises-1042",
  Wanderloop: "/shop/brand-wanderloop-1043",
  "Passport Haus": "/shop/brand-passport-haus-1044",
  "Island Atlas": "/shop/brand-island-atlas-1045",
  "Northline Rail": "/shop/brand-northline-rail-1046",
  Resortly: "/shop/brand-resortly-1047",
  Lightflight: "/shop/brand-lightflight-1048",
  "Safari Roads": "/shop/brand-safari-roads-1049",
  "CityBreak Club": "/shop/brand-citybreak-club-1050",
  "Lagoon Lodge": "/shop/brand-lagoon-lodge-1051",
  MetroTrip: "/shop/brand-metrotrip-1052",
  "Altitude Tours": "/shop/brand-altitude-tours-1053",
  "SeaBreeze Ferries": "/shop/brand-seabreeze-ferries-1054",
  QuickLayover: "/shop/brand-quicklayover-1055",
  "Brush & Bloom": "/shop/brand-brush-and-bloom-1057",
  "Aurum Glow": "/shop/brand-aurum-glow-1059",
  "Noble Nurture": "/shop/brand-noble-nurture-1061",
  "Dew Drop Labs": "/shop/brand-dew-drop-labs-1063",
  "Lush Legacy": "/shop/brand-lush-legacy-1065",
  "Harbor Herbs": "/shop/brand-harbor-herbs-1067",
  "Vitaline Spa": "/shop/brand-vitaline-spa-1068",
} as const;

export function getTopBrandHref(brand: string) {
  return (
    webTopBrandHrefs[brand as keyof typeof webTopBrandHrefs] ??
    `/shop/${brand
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`
  );
}

export type WebShopType = "all" | "mall" | "preferred" | "normal";
export type WebShopDirectorySort = "highest_cashback" | "lowest_cashback" | "popular" | "newest";

const webShopDirectoryCategories = [
  "All",
  "Digital Services",
  "Education",
  "Electronics",
  "Fashion",
  "Finance",
  "Food & Grocery",
  "Gifting & Crafts",
  "Health & Beauty",
  "Home & Living",
  "Marketplace",
  "Travel",
  "Top-up / Recharge",
  "Others",
] as const;

const webShopStoreMetadata = {
  "Grocery Galaxy": {
    addedAt: "2026-03-24",
    category: "Food & Grocery",
    popularity: 1,
    shopType: "preferred",
  },
  "Pocket Pantry": {
    addedAt: "2026-03-22",
    category: "Food & Grocery",
    popularity: 2,
    shopType: "preferred",
  },
  "Orbit Airways": {
    addedAt: "2026-03-21",
    category: "Travel",
    popularity: 3,
    shopType: "normal",
  },
  PixelPort: {
    addedAt: "2026-03-20",
    category: "Electronics",
    popularity: 4,
    shopType: "mall",
  },
  "Glow Theory": {
    addedAt: "2026-03-19",
    category: "Health & Beauty",
    popularity: 5,
    shopType: "preferred",
  },
  "Bloom & Beam": {
    addedAt: "2026-03-18",
    category: "Health & Beauty",
    popularity: 6,
    shopType: "preferred",
  },
  "Urban Checkout": {
    addedAt: "2026-03-17",
    category: "Marketplace",
    popularity: 7,
    shopType: "mall",
  },
  "Nova Travel Club": {
    addedAt: "2026-03-16",
    category: "Travel",
    popularity: 8,
    shopType: "preferred",
  },
  "Circuit Nest": {
    addedAt: "2026-03-15",
    category: "Electronics",
    popularity: 9,
    shopType: "normal",
  },
  "Mint Mirror": {
    addedAt: "2026-03-14",
    category: "Health & Beauty",
    popularity: 10,
    shopType: "preferred",
  },
  "Daily Harvest Box": {
    addedAt: "2026-03-13",
    category: "Food & Grocery",
    popularity: 11,
    shopType: "normal",
  },
  "Sound Loft": {
    addedAt: "2026-03-12",
    category: "Digital Services",
    popularity: 12,
    shopType: "normal",
  },
  "Silk Society": {
    addedAt: "2026-03-11",
    category: "Fashion",
    popularity: 13,
    shopType: "preferred",
  },
  "Horizon Escapes": {
    addedAt: "2026-03-10",
    category: "Travel",
    popularity: 14,
    shopType: "normal",
  },
  "Gadget Grove": {
    addedAt: "2026-03-09",
    category: "Electronics",
    popularity: 15,
    shopType: "mall",
  },
  "Pure Ritual": {
    addedAt: "2026-03-08",
    category: "Health & Beauty",
    popularity: 16,
    shopType: "mall",
  },
  "Luxe Lane Beauty": {
    addedAt: "2026-03-07",
    category: "Health & Beauty",
    popularity: 17,
    shopType: "mall",
  },
  "CloudNine Travel": {
    addedAt: "2026-03-06",
    category: "Travel",
    popularity: 18,
    shopType: "preferred",
  },
  "Volt Market": {
    addedAt: "2026-03-05",
    category: "Electronics",
    popularity: 19,
    shopType: "mall",
  },
  "Cozy Cart": {
    addedAt: "2026-03-04",
    category: "Home & Living",
    popularity: 20,
    shopType: "preferred",
  },
  "Radiant Lab": {
    addedAt: "2026-03-03",
    category: "Health & Beauty",
    popularity: 21,
    shopType: "preferred",
  },
  "StayMint Hotels": {
    addedAt: "2026-03-02",
    category: "Travel",
    popularity: 22,
    shopType: "mall",
  },
  "Echo Devices": {
    addedAt: "2026-03-01",
    category: "Electronics",
    popularity: 23,
    shopType: "normal",
  },
  "Fresh Basket": {
    addedAt: "2026-02-28",
    category: "Food & Grocery",
    popularity: 24,
    shopType: "preferred",
  },
  "Amber Apothecary": {
    addedAt: "2026-02-27",
    category: "Health & Beauty",
    popularity: 25,
    shopType: "normal",
  },
  "Trailhead Outfitters": {
    addedAt: "2026-02-26",
    category: "Travel",
    popularity: 26,
    shopType: "preferred",
  },
  "Nimbus Tech": {
    addedAt: "2026-02-25",
    category: "Electronics",
    popularity: 27,
    shopType: "normal",
  },
  "Harvest & Hearth": {
    addedAt: "2026-02-24",
    category: "Home & Living",
    popularity: 28,
    shopType: "preferred",
  },
  "Velvet Vanity": {
    addedAt: "2026-02-23",
    category: "Health & Beauty",
    popularity: 29,
    shopType: "normal",
  },
  "Skyline Suites": {
    addedAt: "2026-02-22",
    category: "Travel",
    popularity: 30,
    shopType: "mall",
  },
} satisfies Record<
  (typeof webTopBrandCards)[number]["brand"],
  {
    addedAt: string;
    category: (typeof webShopDirectoryCategories)[number];
    popularity: number;
    shopType: Exclude<WebShopType, "all">;
  }
>;

export const webShopDirectory = {
  categoryHeading: "Categories",
  categories: webShopDirectoryCategories,
  emptyTitle: "No shops match those filters.",
  emptyBody: "Try another search, category, or shop type.",
  pagination: {
    pageSize: 24,
  },
  promo: {
    aspectRatio: 800 / 450,
    title: "Promotion by Brands",
    slides: [
      {
        accessibilityLabel: "GoGoQuest — earn bonus points",
        href: "/quest",
        id: "gogoquest",
        imageAsset: "shop-promo-gogoquest",
      },
      {
        accessibilityLabel: "Health and Beauty cashback deals",
        href: "/category/Health%20%26%20Beauty",
        id: "health-beauty",
        imageAsset: "popular-beauty",
      },
      {
        accessibilityLabel: "Travel cashback deals",
        href: "/category/Travel",
        id: "travel",
        imageAsset: "home-banner",
      },
    ],
  },
  resultsUnit: "shops",
  searchLabel: "Search partners",
  searchPlaceholder: "Search by store or product…",
  shopTypePills: [
    { label: "All shop types", value: "all" },
    { label: "Mall", value: "mall" },
    { label: "Preferred", value: "preferred" },
    { label: "Standard", value: "normal" },
  ],
  sortLabel: "Sort by",
  sortPills: [
    { label: "Most Popular", value: "popular" },
    { label: "Newest", value: "newest" },
    { label: "Highest Cashback", value: "highest_cashback" },
    { label: "Lowest Cashback", value: "lowest_cashback" },
  ],
  stores: webTopBrandCards.map((card, index) => {
    const metadata = webShopStoreMetadata[card.brand];
    const href = getTopBrandHref(card.brand);

    return {
      ...card,
      addedAt: metadata.addedAt,
      category: metadata.category,
      href,
      id: href.replace("/shop/", ""),
      position: index + 1,
      popularity: metadata.popularity,
      shopType: metadata.shopType,
    };
  }),
  subtitle:
    "Browse every shop earning you cashback. Filter by shop type or category, search by name, and sort by the rate that matters most.",
  title: "All Shops",
  titleIcon: "🛍️",
  trackingNotice:
    "Cashback tracks within 7 days after each order. Shipping fees and taxes are excluded from the cashback amount.",
} as const;

export type WebShopDirectoryStore = (typeof webShopDirectory.stores)[number];
export type WebBrandDirectorySort = "highest_cashback" | "lowest_cashback" | "popular" | "newest";

export const webBrandDirectory = {
  categoryHeading: "Categories",
  categories: webShopDirectory.categories,
  emptyTitle: "No brands match those filters.",
  emptyBody: "Try another search or category.",
  pagination: {
    pageSize: 24,
  },
  promo: webShopDirectory.promo,
  resultsUnit: "brands",
  searchLabel: "Search partners",
  searchPlaceholder: "Search by store or product…",
  sortLabel: "Sort by:",
  sortPills: [
    { label: "Popular", value: "popular" },
    { label: "Latest", value: "newest" },
    { label: "Highest Cashback", value: "highest_cashback" },
    { label: "Lowest Cashback", value: "lowest_cashback" },
  ],
  stores: webShopDirectory.stores,
  subtitle:
    "Discover every partner brand on GoGoCash. Search by name or browse by category to find the cashback offer that fits.",
  title: "All Brands",
  titleIcon: "✨",
} as const;

export type WebBrandDirectoryStore = (typeof webBrandDirectory.stores)[number];

function getCashbackValue(cashback: string) {
  return Number.parseFloat(cashback.replace("%", "")) || 0;
}

export function getShopDirectoryResults({
  category = "All",
  query = "",
  shopType = "all",
  sortBy = "highest_cashback",
}: {
  category?: string;
  query?: string;
  shopType?: WebShopType | string;
  sortBy?: WebShopDirectorySort | string;
} = {}) {
  const normalizedCategory = category.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedShopType = shopType.trim().toLowerCase();
  const activeCategory = normalizedCategory && normalizedCategory !== "all";

  return webShopDirectory.stores
    .filter((store) => {
      const matchesCategory =
        !activeCategory || store.category.toLowerCase() === normalizedCategory;
      const matchesShopType = normalizedShopType === "all" || store.shopType === normalizedShopType;
      const matchesQuery =
        !normalizedQuery ||
        [store.brand, store.cashback, store.category, store.shopType, store.label].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        );

      return matchesCategory && matchesShopType && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === "popular") {
        return a.popularity - b.popularity || a.position - b.position;
      }

      if (sortBy === "newest") {
        return b.addedAt.localeCompare(a.addedAt) || a.position - b.position;
      }

      const cashbackDifference =
        sortBy === "lowest_cashback"
          ? getCashbackValue(a.cashback) - getCashbackValue(b.cashback)
          : getCashbackValue(b.cashback) - getCashbackValue(a.cashback);

      return cashbackDifference || a.position - b.position;
    });
}

export function getShopDirectoryGridMetrics({
  contentWidth,
  viewportWidth,
}: {
  contentWidth: number;
  viewportWidth: number;
}) {
  const columns =
    viewportWidth >= 1024
      ? 5
      : viewportWidth >= 768
        ? 4
        : viewportWidth >= 640
          ? 3
          : 2;
  const gap = viewportWidth >= 1024 ? 24 : viewportWidth >= 640 ? 16 : 12;
  const cardWidth = roundLayoutValue((contentWidth - gap * Math.max(0, columns - 1)) / columns);

  return {
    cardWidth,
    columns,
    gap,
  };
}

export function getBrandDirectoryResults({
  category = "All",
  query = "",
  sortBy = "highest_cashback",
}: {
  category?: string;
  query?: string;
  sortBy?: WebBrandDirectorySort | string;
} = {}) {
  const normalizedCategory = category.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const activeCategory = normalizedCategory && normalizedCategory !== "all";

  return webBrandDirectory.stores
    .filter((store) => {
      const matchesCategory =
        !activeCategory || store.category.toLowerCase() === normalizedCategory;
      const matchesQuery =
        !normalizedQuery ||
        [store.brand, store.cashback, store.category, store.label].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        );

      return matchesCategory && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === "popular") {
        return a.popularity - b.popularity || a.position - b.position;
      }

      if (sortBy === "newest") {
        return b.addedAt.localeCompare(a.addedAt) || a.position - b.position;
      }

      const cashbackDifference =
        sortBy === "lowest_cashback"
          ? getCashbackValue(a.cashback) - getCashbackValue(b.cashback)
          : getCashbackValue(b.cashback) - getCashbackValue(a.cashback);

      return cashbackDifference || a.position - b.position;
    });
}

export function getBrandDirectoryGridMetrics(args: {
  contentWidth: number;
  viewportWidth: number;
}) {
  return getShopDirectoryGridMetrics(args);
}

export const webHomePromoSections = [
  {
    id: "trending",
    title: "Trending Brands",
    link: "/brand",
    cardVariant: "brandLogoBadge",
    // Each rail is a single 8-column x 2-row group (<=16 cards), so there is one page / no dots.
    dotCount: 1,
    cards: [
      {
        brand: "Grocery Galaxy",
        cashback: "12.5%",
        logoUri: "https://cdn.simpleicons.org/instacart",
        tint: "#6366F1",
      },
      {
        brand: "Pocket Pantry",
        cashback: "10.0%",
        logoUri: "https://cdn.simpleicons.org/instacart",
        tint: "#6366F1",
      },
      {
        brand: "Orbit Airways",
        cashback: "8.5%",
        logoUri: "https://cdn.simpleicons.org/americanairlines",
        tint: "#2563EB",
      },
      {
        brand: "PixelPort",
        cashback: "6.5%",
        logoUri: "https://cdn.simpleicons.org/apple",
        tint: "#2563EB",
      },
      {
        brand: "Glow Theory",
        cashback: "14.0%",
        logoUri: "https://cdn.simpleicons.org/shopify",
        tint: "#6366F1",
      },
      {
        brand: "Bloom & Beam",
        cashback: "15.0%",
        logoUri: "https://cdn.simpleicons.org/nike",
        tint: "#7F1D1D",
      },
      {
        brand: "Fresh Cart",
        cashback: "11.6%",
        logoUri: "https://cdn.simpleicons.org/instacart",
        tint: "#0F9F6E",
      },
      { brand: "Stellar Mart", cashback: "9.0%", logoUri: "https://cdn.simpleicons.org/spotify", tint: "#6366F1" },
      { brand: "Cloud Pantry", cashback: "7.5%", logoUri: "https://cdn.simpleicons.org/instacart", tint: "#2563EB" },
      { brand: "Velvet Threads", cashback: "13.0%", logoUri: "https://cdn.simpleicons.org/ebay", tint: "#0EA5E9" },
      { brand: "Pixel Bazaar", cashback: "6.0%", logoUri: "https://cdn.simpleicons.org/ikea", tint: "#10B981" },
      { brand: "Lumen Living", cashback: "8.0%", logoUri: "https://cdn.simpleicons.org/instacart", tint: "#F59E0B" },
      { brand: "Verdant Grocer", cashback: "10.5%", logoUri: "https://cdn.simpleicons.org/nike", tint: "#EF4444" },
      { brand: "Crimson Couture", cashback: "16.0%", logoUri: "https://cdn.simpleicons.org/target", tint: "#7F1D1D" },
      { brand: "Harbor Goods", cashback: "5.5%", logoUri: "https://cdn.simpleicons.org/sony", tint: "#0F9F6E" },
      { brand: "Aurora Beauty", cashback: "17.0%", logoUri: "https://cdn.simpleicons.org/etsy", tint: "#8B5CF6" },
    ],
  },
  {
    id: "travel",
    title: "Travel Deals are Here!",
    link: "/category/Travel",
    icon: "✈️",
    cardVariant: "brandLogoBadge",
    dotCount: 1,
    cards: [
      {
        brand: "Orbit Airways",
        cashback: "8.5%",
        logoUri: "https://cdn.simpleicons.org/americanairlines",
        tint: "#2563EB",
      },
      {
        brand: "Nova Travel Club",
        cashback: "9.2%",
        logoUri: "https://cdn.simpleicons.org/tripadvisor",
        tint: "#1D4ED8",
      },
      {
        brand: "Horizon Escapes",
        cashback: "8.8%",
        logoUri: "https://cdn.simpleicons.org/meta",
        tint: "#1F3E5F",
      },
      {
        brand: "CloudNine Travel",
        cashback: "10.3%",
        logoUri: "https://cdn.simpleicons.org/tripadvisor",
        tint: "#EAB308",
      },
      {
        brand: "StayMint Hotels",
        cashback: "11.4%",
        logoUri: "https://cdn.simpleicons.org/airbnb",
        tint: "#0EA5E9",
      },
      {
        brand: "Trailhead Outfitters",
        cashback: "9.6%",
        logoUri: "https://cdn.simpleicons.org/tripadvisor",
        tint: "#0F766E",
      },
      {
        brand: "Skyward Suites",
        cashback: "10.9%",
        logoUri: "https://cdn.simpleicons.org/airbnb",
        tint: "#0E7490",
      },
      {
        brand: "Coastal Commute",
        cashback: "8.1%",
        logoUri: "https://cdn.simpleicons.org/meta",
        tint: "#2563EB",
      },
      {
        brand: "Alpine Air Pass",
        cashback: "12.1%",
        logoUri: "https://cdn.simpleicons.org/americanairlines",
        tint: "#334155",
      },
      {
        brand: "Voyage Parade",
        cashback: "7.4%",
        logoUri: "https://cdn.simpleicons.org/tripadvisor",
        tint: "#0E7490",
      },
      {
        brand: "Driftline Cruises",
        cashback: "9.9%",
        logoUri: "https://cdn.simpleicons.org/airbnb",
        tint: "#1D4ED8",
      },
      {
        brand: "Wanderloop",
        cashback: "6.8%",
        logoUri: "https://cdn.simpleicons.org/tripadvisor",
        tint: "#0F766E",
      },
      {
        brand: "Passport Haus",
        cashback: "10.2%",
        logoUri: "https://cdn.simpleicons.org/americanairlines",
        tint: "#7C2D12",
      },
      {
        brand: "Island Atlas",
        cashback: "8.3%",
        logoUri: "https://cdn.simpleicons.org/airbnb",
        tint: "#0EA5E9",
      },
      {
        brand: "Northline Rail",
        cashback: "5.9%",
        logoUri: "https://cdn.simpleicons.org/tripadvisor",
        tint: "#1F3E5F",
      },
      {
        brand: "Resortly",
        cashback: "12.5%",
        logoUri: "https://cdn.simpleicons.org/airbnb",
        tint: "#9F1239",
      },
    ],
  },
  {
    id: "makeup",
    title: "Makeup Must Have!",
    link: "/category/Health & Beauty",
    icon: "💄",
    cardVariant: "brandLogoBadge",
    dotCount: 1,
    cards: [
      {
        brand: "Bloom & Beam",
        cashback: "15.0%",
        logoUri: "https://cdn.simpleicons.org/nike",
        tint: "#7F1D1D",
      },
      {
        brand: "Mint Mirror",
        cashback: "16.5%",
        logoUri: "https://cdn.simpleicons.org/target",
        tint: "#0EA5E9",
      },
      {
        brand: "Pure Ritual",
        cashback: "18.0%",
        logoUri: "https://cdn.simpleicons.org/shopee",
        tint: "#0F766E",
      },
      {
        brand: "Luxe Lane Beauty",
        cashback: "17.2%",
        logoUri: "https://cdn.simpleicons.org/shopify",
        tint: "#F97316",
      },
      {
        brand: "Amber Apothecary",
        cashback: "14.4%",
        logoFallbackText: "Amber Apothecary",
        logoUri: "https://cdn.simpleicons.org/target",
        tint: "#7F1D1D",
      },
      {
        brand: "Pearl Polish",
        cashback: "17.8%",
        logoUri: "https://cdn.simpleicons.org/shopee",
        tint: "#6366F1",
      },
      {
        brand: "Brush & Bloom",
        cashback: "14.7%",
        logoUri: "https://cdn.simpleicons.org/target",
        tint: "#0EA5E9",
      },
      {
        brand: "Aurum Glow",
        cashback: "15.5%",
        logoUri: "https://cdn.simpleicons.org/shopify",
        tint: "#9F1239",
      },
      {
        brand: "Noble Nurture",
        cashback: "17.0%",
        logoUri: "https://cdn.simpleicons.org/target",
        tint: "#2563EB",
      },
      {
        brand: "Dew Drop Labs",
        cashback: "16.9%",
        logoUri: "https://cdn.simpleicons.org/nike",
        tint: "#0EA5E9",
      },
      {
        brand: "Lush Legacy",
        cashback: "15.1%",
        logoUri: "https://cdn.simpleicons.org/shopee",
        tint: "#0F766E",
      },
      {
        brand: "Harbor Herbs",
        cashback: "11.9%",
        logoUri: "https://cdn.simpleicons.org/shopee",
        tint: "#0F766E",
      },
      {
        brand: "Vitaline Spa",
        cashback: "13.8%",
        logoUri: "https://cdn.simpleicons.org/shopify",
        tint: "#14B8A6",
      },
    ],
  },
] as const;

export const webSampleShopCards = [
  {
    category: "Shopping",
    cashback: "12%",
    title: "Top cashback deals",
    label: "Grab Coupon",
  },
  {
    category: "Travel",
    cashback: "8%",
    title: "Travel offers",
    label: "Grab Coupon",
  },
  {
    category: "Electronics",
    cashback: "6%",
    title: "Electronics rewards",
    label: "Grab Coupon",
  },
] as const;

export const webDiscoverCategoryFilters = [
  "All Categories",
  "Grocery",
  "Travel",
  "Electronics",
  "Health & Beauty",
] as const;

export const webDiscoverProductCards = [
  {
    id: "brand-grocery-galaxy-1001",
    brand: "Grocery Galaxy",
    title: "Grocery Galaxy",
    priceLabel: "1,522 THB",
    cashback: "12.5%",
    imageAsset: "home-side-watch",
    tint: "#6366F1",
  },
  {
    id: "brand-pocket-pantry-1002",
    brand: "Pocket Pantry",
    title: "Pocket Pantry",
    priceLabel: "1,569 THB",
    cashback: "10.0%",
    imageAsset: "home-side-grocery",
    tint: "#6366F1",
  },
  {
    id: "brand-orbit-airways-1003",
    brand: "Orbit Airways",
    title: "Orbit Airways",
    priceLabel: "1,616 THB",
    cashback: "8.5%",
    imageAsset: "quest-banner-en",
    tint: "#2563EB",
  },
  {
    id: "brand-pixelport-1004",
    brand: "PixelPort",
    title: "PixelPort",
    priceLabel: "1,663 THB",
    cashback: "6.5%",
    imageAsset: "home-banner",
    tint: "#2563EB",
  },
  {
    id: "brand-glow-theory-1005",
    brand: "Glow Theory",
    title: "Glow Theory",
    priceLabel: "1,710 THB",
    cashback: "14.0%",
    imageAsset: "home-side-grocery",
    tint: "#6366F1",
  },
  {
    id: "brand-bloom-beam-1006",
    brand: "Bloom & Beam",
    title: "Bloom & Beam",
    priceLabel: "1,757 THB",
    cashback: "15.0%",
    imageAsset: "home-banner",
    tint: "#7F1D1D",
  },
  {
    id: "brand-nova-travel-club-1008",
    brand: "Nova Travel Club",
    title: "Nova Travel Club",
    priceLabel: "1,851 THB",
    cashback: "9.2%",
    imageAsset: "quest-banner-en",
    tint: "#1D4ED8",
  },
  {
    id: "brand-pure-ritual-1016",
    brand: "Pure Ritual",
    title: "Pure Ritual",
    priceLabel: "326 THB",
    cashback: "18.0%",
    imageAsset: "home-side-watch",
    tint: "#0F766E",
  },
] as const;

export type WebProductDiscoverySort = "popular" | "newest" | "highCashback";
export type WebProductDiscoveryCashbackMin = 0 | 5 | 10 | 15;

const webProductDiscoveryCategoryFilters = webShopDirectory.categories.map((label) => ({
  label,
  value: label === "All" ? "" : label,
}));

const productDiscoveryImageByCategory: Record<string, string> = {
  "Digital Services": "quest-banner-en",
  Education: "home-banner",
  Electronics: "popular-electronic",
  Fashion: "home-banner",
  Finance: "quest-banner-en",
  "Food & Grocery": "home-side-grocery",
  "Gifting & Crafts": "popular-dinner",
  "Health & Beauty": "popular-beauty",
  "Home & Living": "home-side-watch",
  Marketplace: "home-banner",
  Travel: "quest-banner-en",
  "Top-up / Recharge": "quest-banner-en",
  Others: "home-side-watch",
};

function getProductDiscoverySeed(
  store: WebShopDirectoryStore,
  index: number
): {
  discountPercent: number;
  imageAsset: string;
  originalPriceLabel: string;
  priceLabel: string;
} {
  const fixture = webDiscoverProductCards.find((card) => card.brand === store.brand);
  const generatedPrice = 1220 + index * 47;
  const priceLabel = fixture?.priceLabel ?? `${generatedPrice.toLocaleString("en-US")} THB`;
  const originalPriceLabel = `${Math.round(generatedPrice * 1.18).toLocaleString("en-US")} THB`;

  return {
    discountPercent: index % 4 === 0 ? 18 : index % 3 === 0 ? 12 : 0,
    imageAsset:
      fixture?.imageAsset ?? productDiscoveryImageByCategory[store.category] ?? "home-banner",
    originalPriceLabel,
    priceLabel,
  };
}

export const webProductDiscovery = {
  cashbackFilters: [
    { label: "Any %", value: 0 },
    { label: "5%+", value: 5 },
    { label: "10%+", value: 10 },
    { label: "15%+", value: 15 },
  ],
  categories: webProductDiscoveryCategoryFilters,
  emptyTitle: "No partners found. Try adjusting your filters.",
  pagination: {
    pageSize: 60,
  },
  priceHint: "Price",
  products: webShopDirectory.stores.map((store, index) => {
    const seed = getProductDiscoverySeed(store, index);

    return {
      addedAt: store.addedAt,
      brand: store.brand,
      cashback: store.cashback,
      category: store.category,
      discountPercent: seed.discountPercent,
      href: store.href,
      id: store.id,
      imageAsset: seed.imageAsset,
      originalPriceLabel: seed.originalPriceLabel,
      position: store.position,
      popularity: store.popularity,
      priceLabel: seed.priceLabel,
      shopNowLabel: "Shop Now",
      tint: store.tint,
      title: store.brand,
    };
  }),
  resultsUnit: "brands",
  searchLabel: "Search partners",
  searchPlaceholder: "Search by store or product…",
  sortLabel: "Sort by:",
  sortPills: [
    { label: "Popular", value: "popular" },
    { label: "Latest", value: "newest" },
    { label: "Highest Cashback", value: "highCashback" },
  ],
  subtitle: "Find the best cashback deals by products.",
  termsBody:
    "Purchases made through partner links may be subject to the merchant's terms, return policies, and eligibility rules for cashback or rewards. GoGoCash displays offers for information; final pricing and availability are set by the partner.",
  termsLabel: "Learn more about T&C",
  termsTitle: "Terms and conditions",
  title: "Product Discovery",
} as const;

export type WebProductDiscoveryProduct = (typeof webProductDiscovery.products)[number];

export function getProductDiscoveryResults({
  category = "",
  minCashback = 0,
  query = "",
  sortBy = "popular",
}: {
  category?: string;
  minCashback?: number;
  query?: string;
  sortBy?: WebProductDiscoverySort | string;
} = {}) {
  const normalizedCategory = category.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const activeCategory = normalizedCategory && normalizedCategory !== "all";

  return webProductDiscovery.products
    .filter((product) => {
      const matchesCategory =
        !activeCategory || product.category.toLowerCase() === normalizedCategory;
      const matchesCashback = getCashbackValue(product.cashback) >= minCashback;
      const matchesQuery =
        !normalizedQuery ||
        [product.brand, product.title, product.category, product.priceLabel, product.cashback].some(
          (value) => value.toLowerCase().includes(normalizedQuery)
        );

      return matchesCategory && matchesCashback && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return b.addedAt.localeCompare(a.addedAt) || a.position - b.position;
      }

      if (sortBy === "highCashback") {
        return (
          getCashbackValue(b.cashback) - getCashbackValue(a.cashback) || a.position - b.position
        );
      }

      return a.popularity - b.popularity || a.position - b.position;
    });
}

export function getProductDiscoveryGridMetrics({
  contentWidth,
  viewportWidth,
}: {
  contentWidth: number;
  viewportWidth: number;
}) {
  const columns =
    viewportWidth >= 1280 ? 5 : viewportWidth >= 1024 ? 4 : viewportWidth >= 640 ? 3 : 2;
  const gap =
    viewportWidth >= 1280 ? 24 : viewportWidth >= 1024 ? 20 : viewportWidth >= 640 ? 16 : 8;
  const cardWidth = roundLayoutValue((contentWidth - gap * Math.max(0, columns - 1)) / columns);

  return {
    cardWidth,
    columns,
    gap,
  };
}

export type WebCategoryExploreSort = "highest_cashback" | "lowest_cashback" | "popular" | "newest";

export const webCategoryExploreHealthBeauty = {
  category: "Health & Beauty",
  title: "Explore your Favorite Health & Beauty",
  subtitle:
    "Find cashback deals from brands in Health & Beauty. Search and sort to narrow results.",
  searchPlaceholder: "Search within Health & Beauty",
  sortLabel: "Sort by:",
  storeCountLabel: "13 brands in this category",
  categories: [
    "All",
    "Digital Services",
    "Education",
    "Electronics",
    "Fashion",
    "Finance",
    "Food & Grocery",
    "Gifting & Crafts",
    "Health & Beauty",
    "Home & Living",
    "Marketplace",
    "Travel",
    "Top-up / Recharge",
    "Others",
  ],
  sortPills: [
    { label: "Popular", value: "popular" },
    { label: "Latest", value: "newest" },
    { label: "Highest Cashback", value: "highest_cashback" },
    { label: "Lowest Cashback", value: "lowest_cashback" },
  ],
  stores: [
    {
      brand: "Pure Ritual",
      cashback: "18.0%",
      logoUri: "https://cdn.simpleicons.org/shopee",
      tint: "#0F766E",
    },
    {
      brand: "Pearl Polish",
      cashback: "17.8%",
      logoUri: "https://cdn.simpleicons.org/shopee",
      tint: "#6366F1",
    },
    {
      brand: "Luxe Lane Beauty",
      cashback: "17.2%",
      logoUri: "https://cdn.simpleicons.org/shopify",
      tint: "#F97316",
    },
    {
      brand: "Noble Nurture",
      cashback: "17.0%",
      logoUri: "https://cdn.simpleicons.org/target",
      tint: "#2563EB",
    },
    {
      brand: "Dew Drop Labs",
      cashback: "16.9%",
      logoUri: "https://cdn.simpleicons.org/nike",
      tint: "#0EA5E9",
    },
    {
      brand: "Mint Mirror",
      cashback: "16.5%",
      logoUri: "https://cdn.simpleicons.org/target",
      tint: "#0EA5E9",
    },
    {
      brand: "Aurum Glow",
      cashback: "15.5%",
      logoUri: "https://cdn.simpleicons.org/shopify",
      tint: "#9F1239",
    },
    {
      brand: "Lush Legacy",
      cashback: "15.1%",
      logoUri: "https://cdn.simpleicons.org/shopee",
      tint: "#0F766E",
    },
    {
      brand: "Bloom & Beam",
      cashback: "15.0%",
      logoUri: "https://cdn.simpleicons.org/nike",
      tint: "#7F1D1D",
    },
    {
      brand: "Brush & Bloom",
      cashback: "14.7%",
      logoUri: "https://cdn.simpleicons.org/target",
      tint: "#0EA5E9",
    },
    {
      brand: "Amber Apothecary",
      cashback: "14.4%",
      logoUri: "https://cdn.simpleicons.org/target",
      tint: "#7F1D1D",
    },
    {
      brand: "Vitaline Spa",
      cashback: "13.8%",
      logoUri: "https://cdn.simpleicons.org/shopify",
      tint: "#14B8A6",
    },
    {
      brand: "Harbor Herbs",
      cashback: "11.9%",
      logoUri: "https://cdn.simpleicons.org/shopee",
      tint: "#0F766E",
    },
  ],
} as const;

type CategoryExploreStore = {
  addedAt?: string;
  brand: string;
  cashback: string;
  category?: string;
  logoUri: string;
  popularity?: number;
  tint: string;
};

function categoryExploreCashbackValue(store: CategoryExploreStore): number {
  return Number.parseFloat(store.cashback.replace("%", ""));
}

function getCategoryExploreBaseStores(category: string): CategoryExploreStore[] {
  const normalizedCategory = category.trim().toLowerCase();

  if (
    !normalizedCategory ||
    normalizedCategory === "health & beauty" ||
    normalizedCategory === "beauty"
  ) {
    return [...webCategoryExploreHealthBeauty.stores];
  }

  if (normalizedCategory === "all") {
    return [...webShopDirectory.stores];
  }

  return webShopDirectory.stores.filter(
    (store) => store.category.toLowerCase() === normalizedCategory
  );
}

export function getCategoryExploreResults({
  category = webCategoryExploreHealthBeauty.category,
  query = "",
  sortBy = "highest_cashback",
}: {
  category?: string;
  query?: string;
  sortBy?: WebCategoryExploreSort;
} = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  const baseStores = getCategoryExploreBaseStores(category);
  const filteredStores = normalizedQuery
    ? baseStores.filter((store) => store.brand.toLowerCase().includes(normalizedQuery))
    : [...baseStores];

  switch (sortBy) {
    case "lowest_cashback":
      return filteredStores.sort(
        (left, right) => categoryExploreCashbackValue(left) - categoryExploreCashbackValue(right)
      );
    case "newest":
      return filteredStores.sort((left, right) => {
        if (left.addedAt && right.addedAt) {
          return right.addedAt.localeCompare(left.addedAt);
        }

        return 0;
      });
    case "popular":
      return filteredStores.sort((left, right) => {
        if (left.popularity && right.popularity) {
          return left.popularity - right.popularity;
        }

        return 0;
      });
    case "highest_cashback":
    default:
      return filteredStores.sort(
        (left, right) => categoryExploreCashbackValue(right) - categoryExploreCashbackValue(left)
      );
  }
}

export const webShopDetailGroceryGalaxy = {
  id: "brand-grocery-galaxy-1001",
  brand: "Grocery Galaxy",
  bannerAsset: "home-side-watch",
  logoText: "GO",
  category: "others",
  cashback: "26.5%",
  extraCashback: "14%",
  shopNowLabel: "Shop Now",
  disclaimer:
    "The cashback rates shown above are the maximum possible amounts. Actual rates vary by merchant and specific order conditions. Final approval is at the sole discretion of the merchant; GoGoCash acts as a platform provider for your convenience.",
  maxPerTransaction: "Cashback maximum up to 50 THB per transaction.",
  rateSummary: {
    from: "0%",
    upTo: "0%",
  },
  productRates: [
    { name: "Groceries", rate: "0%" },
    { name: "Lifestyle", rate: "0%" },
  ],
  note: "Promo stack: this merchant may run time-limited campaigns. Cashback can take up to 7 days to track after delivery.",
  trackingPeriod: [
    { label: "Purchase", detail: "with GoGoCash", icon: "shopping" },
    { label: "Tracking", detail: "within 30 day", icon: "check" },
    { label: "Confirm", detail: "within 30 day", icon: "bank" },
  ],
  referral: {
    title: "10% Cashback Bonus",
    subtitle: "Share & earn 10% friend cashback payout",
    body: "Share your referral link. You earn 10% cashback payout whenever your friend receives cashback in their wallet.",
    actionLabel: "Share now",
  },
  questBanner: {
    href: "/quest",
    imageAsset: "quest-banner-en",
    imageWidth: 720,
    imageHeight: 405,
    radius: 24,
    gapAfter: 56,
    accessibilityLabel: "GoGoQuest bonus banner",
  },
  deals: {
    title: "Target Top Coupons and Deals",
    emptyTitle: "No deals available right now",
    emptySubtitle: "Please favorite us to stay updated on great deals",
  },
  cashbackTips: {
    title: "Cashback Tips",
    tips: [
      {
        id: "excluded-products",
        kind: "highlight",
        badgeKey: "excludedProductsLabel",
        leadKey: "excludedProductsTipLead",
        emphasisKey: "excludedProductsTipEmphasis",
        showLiveVideoLabels: true,
      },
      {
        id: "check-terms",
        kind: "text",
        titleKey: "merchantCashbackTipCheckTermsTitle",
        bodyKey: "merchantCashbackTipCheckTermsBody",
      },
      {
        id: "restart-platform",
        kind: "text",
        titleKey: "merchantCashbackTipRestartPlatformTitle",
        bodyKey: "merchantCashbackTipRestartPlatformBody",
      },
      {
        id: "no-adblock",
        kind: "text",
        titleKey: "merchantCashbackTipNoAdblockTitle",
        bodyKey: "merchantCashbackTipNoAdblockBody",
      },
      {
        id: "empty-cart",
        kind: "text",
        titleKey: "merchantCashbackTipEmptyCartTitle",
        bodyKey: "merchantCashbackTipEmptyCartBody",
        merchantCategories: ["travel"],
      },
      {
        id: "payment-fail",
        kind: "text",
        titleKey: "merchantCashbackTipPaymentFailTitle",
        bodyKey: "merchantCashbackTipPaymentFailBody",
        merchantCategories: ["travel"],
      },
      {
        id: "accept-cookies",
        kind: "text",
        titleKey: "merchantCashbackTipAcceptCookiesTitle",
        bodyKey: "merchantCashbackTipAcceptCookiesBody",
        merchantCategories: ["travel"],
      },
    ],
  },
  terms: {
    eyebrow: "💡",
    title: "Cashback Tips",
    subtitle: "Terms and exclusions",
    exclusionsTitle: "Exclusions",
    bullets: [
      "You will not earn cashback if you visit the merchant directly instead of using GoGoCash.",
      "Cashback may be declined when coupons or discounts are not approved by the merchant.",
      "Final tracking and approval depend on the merchant and affiliate network.",
    ],
  },
} as const;

export const profileHubSections = [
  "profileTitle",
  "walletSummaryHeroCard",
  "profileNavigationPanel",
  "logoutAction",
] as const;

export const profileHubSubNavItems = [
  { label: "Personal Information", href: "/profile/info" },
  { label: "My Rating Score", href: "/credit-score" },
  { label: "Withdraw Methods", href: "/method" },
  { label: "Account Setting", href: "/language" },
] as const;

/** Desktop profile-rail accordion under GoGoTrack — mirrors hub quick links. */
export const profileHubGoGoTrackSubNavItems = [
  { label: "Overview", href: "/gototrack" },
  { label: "Start setup", href: "/gototrack/onboarding" },
  { label: "Permissions", href: "/gototrack/permissions" },
  { label: "Settings", href: "/gototrack/settings" },
] as const;

export const profileHubMenuItems = [
  { label: "Profile", href: "/profile", activePrefix: "/profile" },
  { label: "Invite your Friends", href: "/referral", activePrefix: "/referral" },
  { label: "My Wallet", href: "/wallet", activePrefix: "/wallet" },
  { label: "GoGoTrack", href: "/gototrack", activePrefix: "/gototrack" },
  { label: "GoGoPass", href: "/membership", activePrefix: "/membership" },
  { label: "Missing Orders", href: "/missing-orders", activePrefix: "/missing-orders" },
  { label: "Favorite Brands", href: "/favorite", activePrefix: "/favorite" },
  { label: "GoGoQuest History", href: "/quest/history", activePrefix: "/quest/history" },
  { label: "Age Verification", href: "/age-verification", activePrefix: "/age-verification" },
  { label: "Consent Preferences", href: "/privacy-center", activePrefix: "/privacy-center" },
  { label: "Privacy Policy", href: "/privacy-policy", activePrefix: "/privacy-policy" },
  { label: "Terms of Use", href: "https://gogocash.co/term-of-use", external: true },
  { label: "Terms of Service", href: "https://gogocash.co/terms-of-service", external: true },
  { label: "Help Center", href: "https://lin.ee/7om5sAr", external: true },
  { label: "Connect with GoGoCash", href: "https://linktr.ee/gogocash", external: true },
] as const;

export const webWithdrawMethodPage = {
  title: "Withdraw Method",
  heading: "My withdrawal methods",
  addLabel: "Add Methods",
  defaultLabel: "[Default]",
  methods: [
    {
      id: "mock-kbank-default",
      accountName: "Demo Shopper",
      bankName: "Kasikorn Bank",
      maskedAccount: "****7890",
      isDefault: true,
    },
    {
      id: "mock-bangkok-bank",
      accountName: "Demo Shopper",
      bankName: "Bangkok Bank",
      maskedAccount: "****3210",
      isDefault: false,
    },
  ],
} as const;

export const webAccountSettingsPage = {
  title: "Account Settings",
  appearance: {
    title: "Appearance",
    helper: "System follows your phone or browser setting.",
    options: [
      { id: "system", label: "System default" },
      { id: "light", label: "Light" },
      { id: "dark", label: "Dark" },
    ],
  },
  subscription: {
    title: "Your Subscription",
    description: "View and manage your GoGoCash subscription billing on Stripe.",
    actionLabel: "Open Stripe Subscription",
    disabledNote: "Subscription billing is not enabled yet.",
  },
  notifications: {
    title: "Receive Notifications about Updates",
    comingSoonLabel: "Coming soon",
    rows: [
      { id: "line", label: "Notifications via Line", enabled: false },
      { id: "email", label: "Notifications via Email", enabled: true },
    ],
  },
  community: {
    title: "Join our Community",
    joinLabel: "Join Us on",
    cards: [
      { id: "facebook", label: "Facebook", asset: "facebook" },
      { id: "instagram", label: "Instagram", asset: "instagram" },
      { id: "line", label: "Line", asset: "line" },
      { id: "youtube", label: "YouTube", asset: "youtube" },
      { id: "x", label: "X", asset: "x" },
      { id: "telegram", label: "Telegram", asset: "telegram" },
      { id: "luma", label: "Luma", asset: "luma" },
      { id: "linkedin", label: "LinkedIn", asset: "linkedin" },
      { id: "discord", label: "Discord", asset: "discord" },
      { id: "questn", label: "QuestN", asset: "questn" },
      { id: "github", label: "GitHub", asset: "github" },
      { id: "angellist", label: "Angel List", asset: "angellist" },
      { id: "crunchbase", label: "Crunch Base", asset: "crunchbase" },
    ],
  },
} as const;

export const webFavoriteBrandsPage = {
  title: "Favorite Brands",
  hero: {
    title: "Find Your Brands",
    description:
      "Find your favorite brands, explore new ones, and enjoy cashback on every purchase.",
    actionLabel: "See More",
    actionHref: "/shops",
    logoAlt: "GoGoCash",
    illustrationAlt: "Shopping and cashback",
  },
  recentTitle: "Recently Visited Brands",
  favoritesTitle: "Your Favorite Brands",
  searchPlaceholder: "Search brands",
  sortLabel: "Sort by",
  grabCouponLabel: "Grab Coupon",
  cashbackLabel: "Cashback upto",
  recentBrands: [
    {
      id: "brand-grocery-galaxy-1001",
      name: "Grocery Galaxy",
      category: "Others",
      cashback: "12.5%",
      href: "/shop/brand-grocery-galaxy-1001",
      artAsset: "sideGrocery",
      showGrabCoupon: true,
    },
    {
      id: "brand-pocket-pantry-1002",
      name: "Pocket Pantry",
      category: "Others",
      cashback: "10.0%",
      href: "/shop/brand-pocket-pantry-1002",
      artAsset: "homeBanner",
      showGrabCoupon: true,
    },
    {
      id: "brand-orbit-airways-1003",
      name: "Orbit Airways",
      category: "Travel",
      cashback: "8.5%",
      href: "/shop/brand-orbit-airways-1003",
      artAsset: "sideWatch",
      showGrabCoupon: false,
    },
    {
      id: "brand-glow-theory-1005",
      name: "Glow Theory",
      category: "Beauty",
      cashback: "14.0%",
      href: "/shop/brand-glow-theory-1005",
      artAsset: "sideGrocery",
      showGrabCoupon: true,
    },
  ],
} as const;

export const webMissingOrdersPage = {
  title: "Missing Orders",
  intro:
    "Self-service form: add your purchase details, then submit to open LINE and send them to our team. You can follow and track your case directly in the chat.",
  supportActionLabel: "Get help on LINE",
  clearActionLabel: "Clear Data",
  submitActionLabel: "Submit claim",
  sections: [
    {
      id: "purchase",
      title: "Your purchase",
      help: "Choose where you bought the item and enter the same order details you see in the store's app or confirmation email.",
      fields: [
        {
          label: "Store or marketplace",
          value: "Shopee",
          helper: "Choose the partner where you completed the order.",
          icon: "store",
        },
        {
          label: "Order ID",
          value: "GC-2026-0001",
          helper: "Usually in the order confirmation email or under “My orders” in the store app.",
          icon: "hash",
        },
        {
          label: "Purchase Amount in THB",
          value: "1,250.00",
          helper: "Total paid in THB (as shown on the order).",
          icon: "amount",
        },
        {
          label: "Purchase Date",
          value: "2026-03-28",
          helper:
            "Tap the field to open your device calendar. Purchase date cannot be in the future.",
          icon: "calendar",
        },
      ],
    },
    {
      id: "account",
      title: "Your GoGoCash account",
      help: "We match claims using this user ID. It must be the same account you were logged into when you shopped through GoGoCash.",
      fields: [
        {
          label: "User ID",
          value: "******",
          helper: "Ensure user ID matches the purchasing account",
          icon: "user",
        },
      ],
    },
    {
      id: "extra",
      title: "Extra context",
      help: "Notes are optional. Screenshots or receipts are required (up to 5 images, 5 MB each) so our team can review your claim in LINE.",
      fields: [
        {
          label: "Note (Optional)",
          value: "Order tracked from GoGoCash but cashback is missing.",
          helper: "Add anything that helps our support team review the claim.",
          icon: "note",
        },
        {
          label: "Screenshots or receipts",
          value: "Add images",
          helper:
            "Required — add at least 1 image, up to 5 total, 5 MB each (e.g. order confirmation or payment slip).",
          icon: "image",
        },
      ],
    },
  ],
  bullets: [
    "Claims must be submitted within 90 days of purchase.",
    "Missing conversions can only be reported 3 days after purchase.",
    "We cannot track missing conversions for CPC, CPO, CPI, CPUC, CPIO commission models.",
  ],
  quickCards: [
    { title: "How to get", accent: "Cashback", icon: "shopping" },
    { title: "Step by step", accent: "User Guide", icon: "guide" },
    { title: "Contact", accent: "Team Support", icon: "support" },
  ],
  faqTitle: "Need help with cashback? We're here to assist you.",
  faqs: [
    {
      question: "What is GoGoCash?",
      answer:
        "GoGoCash is a cashback platform that rewards you when you shop with partner stores through our links.",
    },
    {
      question: "How to claim cashback?",
      answer:
        "Shop via GoGoCash tracked links, complete your purchase, and eligible cashback will show in your wallet after the merchant confirms the order.",
    },
    {
      question: "Why cashback transfer is incomplete?",
      answer:
        "Transfers can be delayed if the merchant is still validating the order, if the return window applies, or if additional verification is required.",
    },
  ],
} as const;

export const webPrivacyCenterPage = {
  title: "Privacy center",
  sectionTitle: "Consent preferences",
  microNotice:
    "We collect this information for the stated purpose under PDPA. See Privacy Policy for details.",
  hero: {
    title: "Get the full GoGoCash experience",
    body: "Optional consents let us personalize offers, measure what works, share aggregated insights with partners, and run eligibility checks—so cashback and rewards work smoothly for you.",
    actionLabel: "Accept all optional consents",
    allEnabledLabel: "All optional consents are already on.",
    hint: "One tap enables marketing, analytics, B2B aggregated insights, and AI credit scoring where applicable. You can turn any item off below.",
  },
  optionalTitle: "Optional data uses",
  offLabel: "Off",
  onLabel: "On",
  optionalPurposes: [
    {
      id: "marketing",
      title: "Marketing communications",
      description: "Email, SMS, LINE, or push about offers and updates you may like.",
    },
    {
      id: "analytics",
      title: "Analytics",
      description: "Helps us fix bugs, improve flows, and understand feature usage in aggregate.",
    },
    {
      id: "b2b",
      title: "B2B aggregated insights",
      description:
        "Anonymous or aggregated trends shared with merchants and partners to improve programs.",
    },
    {
      id: "ai",
      title: "AI credit scoring",
      description:
        "Automated checks for offers or limits where you choose products that use scoring.",
    },
  ],
  required: {
    title: "Cashback tracking (required for service)",
    badge: "Always on",
    description:
      "We track eligible purchases and cashback while your account is active so we can credit rewards and meet merchant agreements. This is not optional while you use the service.",
  },
} as const;

export const webGoGoTrackPermissionsPage = {
  sectionTitle: "Permission checklist",
  microNotice:
    "GoGoTrack never enables sensitive signals silently. Review why each permission is needed before granting access.",
  hero: {
    title: "Enable GoGoTrack to protect your cashback",
    eyebrow: "Grant access",
    body: "Grant usage access and optional notifications so GoGoTrack can detect supported stores, prompt activation, and recover missing cashback evidence.",
    actionLabel: "Enable all GoGoTrack permissions",
    allEnabledLabel: "All GoGoTrack permissions are already enabled.",
    hint: "One tap opens Android Usage Access when needed, then enables cashback notifications and screenshot recovery. You can adjust each permission below.",
    hintWeb:
      "Turn permissions on or off below. Preferences save to your account; native cashback alerts need the Android app with Usage Access granted.",
  },
  permissionsTitle: "Tracking permissions",
  onLabel: "On",
  offLabel: "Off",
  items: [
    {
      id: "usageAccess",
      title: "Usage access",
      description: "Detect supported shopping apps and browser transitions.",
      kind: "os_grant" as const,
    },
    {
      id: "backgroundPrompts",
      title: "Cashback notifications",
      description:
        "Optional heads-up while supported stores are open. Save your preference here; native notifications need Android and Usage Access.",
      kind: "toggle" as const,
      field: "backgroundPromptsEnabled" as const,
      requiresUsageAccess: true,
    },
    {
      id: "screenshotRecovery",
      title: "Screenshot recovery",
      description: "Allow user-submitted screenshots only when automatic tracking fails.",
      kind: "toggle" as const,
      field: "screenshotRecoveryEnabled" as const,
    },
  ],
  usageAccessGrantedLabel: "Usage access granted",
  usageAccessNotGrantedLabel: "Usage access not granted yet",
  usageAccessAndroidOnlyLabel: "Usage access is only available on Android",
  grantUsageAccessLabel: "Grant usage access",
  grantedLabel: "Granted",
  requiresUsageAccessHint:
    "Native cashback notifications require Android and Usage Access. Your preference is saved here and applies when tracking is active.",
  backgroundPromptsPendingUsageAccessHint:
    "Grant Usage Access on Android before cashback notifications can fire.",
  disclosure: {
    title: "Usage access disclosure",
    body: "These controls map to native OS permission prompts and privacy-policy wording. GoGoTrack uses Android Usage Access to detect supported shopping apps. Nothing is read until you grant access.",
  },
} as const;

export const webQuestHistory = {
  heroKicker: "GoGoQuest",
  heroTitle: "See your points, rewards, and how you rank—then plan your next shop.",
  pageIntro: "Earn quest points when you shop through GoGoCash during an active round. Here you can check your score, look back month by month, see bonuses you unlocked, and peek at the leaderboard. Use it to decide when to shop next and which tasks or stores to hit.",
  planTitle: "Plan your next round",
  planSteps: [
    "Open Quest to see time-limited tasks and stores that give extra points.",
    "Start from GoGoCash, then complete checkout at the partner store so your order counts.",
    "Check this page again to watch your points grow and grab bonuses when you qualify."
  ],
  viewQuestHubShort: "Quest",
  planCtaBrowseShort: "Stores",
  currentCampaign: "This quest round",
  roundShopHint: "These are the dates when eligible shopping and tasks can add to your quest score.",
  periodLabel: "Shop & earn during",
  periodPending: "The next quest round is not open yet. We will show the dates here when it starts.",
  yourScoreLabel: "Your quest points",
  signInHint: "Sign in to see your quest points and history.",
  scoreFootnote: "From this round only. Older months are listed below.",
  monthlySection: "Your points by month",
  monthlySectionHint: "Taller bars mean a stronger month—use it to spot when you shopped most.",
  emptyMonthly: "Once you earn quest points, you will see each month here with a simple bar so you can compare at a glance.",
  pointsSuffix: "pts",
  rewardsSection: "Bonuses you earned",
  rewardsSectionHint: "Extra points or perks unlocked from quests—great to review before the next round.",
  emptyRewards: "No bonuses yet—complete quest tasks during a round to unlock extra points and perks."
} as const;
