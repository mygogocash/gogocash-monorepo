import { describe, expect, it } from "vitest";

import {
  getAccountShellFooterHorizontalPadding,
  getAccountShellFrameMetrics,
  getCarouselActiveIndex,
  getCarouselDotCount,
  getDesktopFooterGrid,
  getDesktopShellOffset,
  getDesktopShellContentWidth,
  getDesktopShellHorizontalPadding,
  getHomeSearchMatches,
  getResponsiveHomeLayoutMetrics,
  mobileShellLayout,
  webCookieConsentBanner,
  profileHubMenuItems,
  profileHubSections,
  profileHubSubNavItems,
  webBrowseShortcuts,
  webDesktopFooter,
  webDesktopHeaderNavItems,
  webDiscoverProductCards,
  webHomeSectionOrder,
  webHomeSearchPopularPanel,
  webHomeSearchPlaceholder,
  webHomePromoSections,
  webLineOfficialFab,
  webMobileBottomNavItems,
  webTopBrandCards,
} from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

describe("GoGoCash web design parity", () => {
  it("design tokens > given web CSS variables > then mobile uses the same GoGoCash palette", () => {
    expect(colors).toMatchObject({
      background: "#F6F6F6",
      card: "#FFFFFF",
      ink: "#3B3B3B",
      muted: "#7F7F7F",
      primary: "#00CC99",
      primaryDark: "#00AA80",
      primarySoft: "#D8F8EF",
      textSoft: "#989898",
      border: "#E4E4E4",
      accent: "#005D46",
    });
    expect(radii).toEqual({
      sm: 8,
      md: 16,
      lg: 24,
      xl: 24,
      chip: 999,
    });
    expect(shadows.bottomNav).toEqual({
      elevation: 12,
      shadowColor: "#102217",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.14,
      shadowRadius: 30,
    });
    expect(shadows.card).toEqual({
      elevation: 2,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
    });
    expect(shadows.card).not.toHaveProperty("opacity");
    expect(shadows.bottomNav).not.toHaveProperty("opacity");
  });

  it("home layout > given the web mobile homepage > then mobile preserves section order", () => {
    expect(webHomeSectionOrder).toEqual([
      "stickySearch",
      "browseShortcuts",
      "banner",
      "extra",
      "trending",
      "categoryHome",
    ]);
    expect(spacing.homeStackGap).toBe(16);
    expect(mobileShellLayout).toMatchObject({
      contentMaxWidth: 1440,
      contentHorizontalPadding: 16,
      contentHorizontalPaddingMax: 120,
      contentHorizontalPaddingRatio: 0.04,
      desktopBreakpoint: 1024,
      desktopContentHorizontalPadding: 16,
      desktopContentMaxWidth: 1440,
      desktopBottomClearance: 40,
      desktopHeaderHeight: 80,
      desktopHeaderPaddingMax: 120,
      desktopHeaderPaddingMin: 56,
      desktopHeaderPaddingRatio: 0.055,
      desktopHomeStackGap: 40,
      desktopHomeTopGap: 64,
      desktopSubNavHeight: 56,
      contentTopGap: 24,
      homeBannerAspectRatio: 1920 / 1080,
      homeSideBannerAspectRatio: 1920 / 1080,
      compactBrandGridGap: 10,
      compactBrandLogoVisualHeight: 106,
      compactBrandMobileColumns: 3,
      compactBrandMobileRowsPerPage: 2,
      compactBrandDesktopColumns: 8,
      compactBrandDesktopRowsPerPage: 2,
      shortcutPillHeight: 38,
      topBrandDesktopDotCount: 3,
      topBrandDesktopColumns: 6,
      topBrandDesktopGridGap: 24,
      topBrandTabletColumns: 3,
      topBrandTabletGridGap: 16,
      topBrandGridGap: 24,
      topBrandMobileDotCount: 4,
      topBrandMobileGridGap: 12,
      topBrandMobilePageCardCount: 4,
      topBrandMobileColumns: 2,
      topBrandMetaHeight: 56,
      compactBrandMetaHeight: 43,
      homePromoSectionGap: 24,
      homeSectionHeaderHeight: 56,
      bottomNavMaxWidth: 448,
      bottomNavClearance: 108,
      searchPopoverActionMinWidth: 100,
      searchPopoverResultRowGap: 10,
    });
  });

  it("home responsive layout > given mobile viewport > then keeps mobile shell and bottom nav", () => {
    expect(getResponsiveHomeLayoutMetrics(390)).toMatchObject({
      compactBrandColumns: 2,
      contentHorizontalPadding: 16,
      contentMaxWidth: 1440,
      isDesktop: false,
      pageBottomPadding: 132,
      showBottomNav: true,
      topBrandCardsPerPage: 4,
      topBrandColumns: 2,
      topBrandDotCount: 4,
    });
    expect(getResponsiveHomeLayoutMetrics(390).compactBrandCardWidth).toBeCloseTo(144, 1);
  });

  it("home responsive layout > given staging mobile Trending Brands viewport > then compact cards match selected section", () => {
    expect(getResponsiveHomeLayoutMetrics(427)).toMatchObject({
      compactBrandCardHeight: 176,
      compactBrandColumns: 2,
      compactBrandGap: 59,
      compactBrandLogoVisualHeight: 117,
      brandSectionFrameWidth: 347,
    });
    expect(getResponsiveHomeLayoutMetrics(427).compactBrandCardWidth).toBeCloseTo(144, 1);
  });

  it("home responsive layout > given 455px mobile Trending Brands viewport > then compact promo cards keep fixed width and scroll", () => {
    const layout = getResponsiveHomeLayoutMetrics(455);
    const usedWidth =
      layout.compactBrandCardWidth * layout.compactBrandColumns +
      layout.compactBrandGap * (layout.compactBrandColumns - 1);

    expect(layout.compactBrandColumns).toBe(2);
    expect(usedWidth).toBeCloseTo(layout.brandSectionFrameWidth, 3);
    expect(layout.contentHorizontalPadding * 2 + usedWidth).toBeLessThanOrEqual(455);
  });

  it("home responsive layout > given 455px mobile Travel Deals viewport > then compact promo cards keep fixed width and scroll", () => {
    const layout = getResponsiveHomeLayoutMetrics(455);
    const travel = webHomePromoSections.find((section) => section.id === "travel");
    const usedWidth =
      layout.compactBrandCardWidth * layout.compactBrandColumns +
      layout.compactBrandGap * (layout.compactBrandColumns - 1);

    expect(travel).toMatchObject({
      dotCount: 2,
      icon: "✈️",
      link: "/category/Travel",
      title: "Travel Deals are Here!",
    });
    expect(travel?.cards.slice(0, layout.compactBrandCardsPerPage).map((card) => card.brand)).toEqual(
      [
        "Orbit Airways",
        "Nova Travel Club",
        "Horizon Escapes",
        "CloudNine Travel",
      ]
    );
    expect(layout.compactBrandColumns).toBe(2);
    expect(layout.compactBrandCardsPerPage).toBe(4);
    expect(usedWidth).toBeCloseTo(layout.brandSectionFrameWidth, 3);
  });

  it("home responsive layout > given staging mobile Top Brands viewport > then uses the same card grid width", () => {
    expect(getResponsiveHomeLayoutMetrics(427)).toMatchObject({
      brandSectionFrameWidth: 347,
      topBrandCardsPerPage: 4,
      topBrandColumns: 2,
      topBrandDotCount: 4,
      topBrandGap: 0,
    });
    expect(getResponsiveHomeLayoutMetrics(427).topBrandCardWidth).toBeCloseTo(176, 1);
    expect(getResponsiveHomeLayoutMetrics(427).topBrandCardHeight).toBeCloseTo(224, 1);
  });

  it("home responsive layout > given vertical tablet viewport > then Top Brands uses the tablet frame", () => {
    expect(getResponsiveHomeLayoutMetrics(834)).toMatchObject({
      contentHorizontalPadding: 24,
      contentWidth: 786,
      topBrandCardsPerPage: 8,
      topBrandColumns: 4,
    });
    expect(getResponsiveHomeLayoutMetrics(834).topBrandGap).toBeCloseTo(11.33, 1);
    expect(getResponsiveHomeLayoutMetrics(834).topBrandCardWidth).toBeCloseTo(176, 1);
  });

  it("home responsive layout > given desktop viewport > then expands content and removes mobile bottom nav", () => {
    expect(getResponsiveHomeLayoutMetrics(1440)).toMatchObject({
      compactBrandColumns: 8,
      contentHorizontalPadding: 120,
      contentMaxWidth: 1440,
      isDesktop: true,
      pageBottomPadding: 40,
      showBottomNav: false,
      topBrandCardsPerPage: 12,
      topBrandColumns: 6,
      topBrandDotCount: 3,
    });
    expect(getResponsiveHomeLayoutMetrics(1440).compactBrandCardWidth).toBeCloseTo(144, 1);
    expect(getResponsiveHomeLayoutMetrics(1440).compactBrandCardHeight).toBeCloseTo(176, 1);
    expect(getResponsiveHomeLayoutMetrics(1440).topBrandCardWidth).toBeCloseTo(176, 1);
    expect(getResponsiveHomeLayoutMetrics(1440).topBrandCardHeight).toBeCloseTo(224, 1);
    const desktopLayout = getResponsiveHomeLayoutMetrics(1440);
    const compactRowWidth =
      desktopLayout.compactBrandColumns * desktopLayout.compactBrandCardWidth +
      (desktopLayout.compactBrandColumns - 1) * desktopLayout.compactBrandGap;
    const topBrandRowWidth =
      desktopLayout.topBrandColumns * desktopLayout.topBrandCardWidth +
      (desktopLayout.topBrandColumns - 1) * desktopLayout.topBrandGap;
    expect(desktopLayout.compactBrandColumns).toBe(8);
    expect(desktopLayout.compactBrandCardsPerPage).toBe(16);
    expect(compactRowWidth).toBeCloseTo(desktopLayout.contentWidth, 3);
    expect(desktopLayout.topBrandGap).toBeCloseTo(28.8, 3);
    expect(topBrandRowWidth).toBeCloseTo(desktopLayout.contentWidth, 3);
  });

  it("desktop shell parity > given the Next desktop nav reference > then Expo keeps the same category nav order and cookie copy", () => {
    expect(webDesktopHeaderNavItems.map((item) => item.label)).toEqual([
      "Top Brands",
      "All Brands",
      "All Shops",
      "Product Discovery",
      "Travel",
      "Electronics",
      "Health & Beauty",
    ]);
    expect(webDesktopHeaderNavItems[0]).toMatchObject({
      active: true,
      showFire: true,
    });
    expect(webDesktopHeaderNavItems[3]).toMatchObject({
      label: "Product Discovery",
      menuTypography: "lead",
    });
    expect(webDesktopHeaderNavItems[5]).toMatchObject({
      label: "Electronics",
      menuTypography: "lead",
    });
    expect(webDesktopHeaderNavItems[6]).toMatchObject({
      label: "Health & Beauty",
      menuTypography: "lead",
    });
    expect(webCookieConsentBanner).toMatchObject({
      allow: "Accept all cookies",
      decline: "Cookie settings",
      dismissedEventName: "gc:consent-banner-dismissed",
      dismissedStorageKey: "pdpa_consent_banner_dismissed_v1",
      openEventName: "gc:open-consent-banner",
      privacyPolicyLabel: "Privacy Policy",
      title: "We use cookies in the delivery of our services.",
    });
    expect(getDesktopShellHorizontalPadding(1024)).toBe(56);
    expect(getDesktopShellHorizontalPadding(1199)).toBe(56);
    expect(getDesktopShellHorizontalPadding(1200)).toBe(120);
    expect(getDesktopShellHorizontalPadding(1279)).toBe(120);
    expect(getDesktopShellHorizontalPadding(1440)).toBe(120);
    expect(getDesktopShellHorizontalPadding(2048)).toBe(120);
    expect(getDesktopShellOffset(1024)).toBe(0);
    expect(getDesktopShellOffset(1440)).toBe(0);
    expect(getDesktopShellOffset(1509)).toBeCloseTo(34.5);
    expect(getDesktopShellOffset(2048)).toBe(304);
    expect(getDesktopShellContentWidth(1279)).toBe(1039);
    expect(getDesktopShellContentWidth(1440)).toBe(1200);
    expect(getDesktopShellContentWidth(2048)).toBe(1200);
    expect(webLineOfficialFab).toEqual({
      href: "https://lin.ee/7om5sAr",
      label: "LINE Official Account",
    });
  });

  it("account shell frame > given desktop profile/rail page > then it matches the navbar shell so content lines up with the logo and globe", () => {
    // Navbar content column = min(vw, 1440) inset by getDesktopShellHorizontalPadding
    // (80 at >=1200, 56 at 1024-1199). The account/profile shell must use the SAME
    // pair so the user-section card's left edge meets the logo and its right edge
    // meets the globe.
    expect(getAccountShellFrameMetrics(1440, { alignToNavbarShell: true })).toEqual({
      maxWidth: 1440,
      paddingHorizontal: 120,
    });
    expect(getAccountShellFrameMetrics(1600, { alignToNavbarShell: true })).toEqual({
      maxWidth: 1440,
      paddingHorizontal: 120,
    });
    expect(getAccountShellFrameMetrics(1100, { alignToNavbarShell: true })).toEqual({
      maxWidth: 1440,
      paddingHorizontal: 56,
    });
  });

  it("account shell frame > given desktop non-rail page (quest) > then it keeps the legacy account width/padding", () => {
    expect(getAccountShellFrameMetrics(1440, { alignToNavbarShell: false })).toEqual({
      maxWidth: 1180,
      paddingHorizontal: 16,
    });
  });

  it("account shell frame > given a phone width (<768) > then it uses the full-bleed mobile content width regardless of alignment", () => {
    expect(getAccountShellFrameMetrics(500, { alignToNavbarShell: true })).toEqual({
      maxWidth: 1440,
      paddingHorizontal: 16,
    });
    expect(getAccountShellFrameMetrics(500, { alignToNavbarShell: false })).toEqual({
      maxWidth: 1440,
      paddingHorizontal: 16,
    });
  });

  it("account shell frame > given a tablet width (768-1023) > then single-column shell content is capped + centered (was stretched-phone before the tablet tier)", () => {
    expect(getAccountShellFrameMetrics(800)).toEqual({
      maxWidth: 720,
      paddingHorizontal: 32,
    });
    // alignToNavbarShell only governs the desktop branch; tablet still caps.
    expect(getAccountShellFrameMetrics(800, { alignToNavbarShell: true })).toEqual({
      maxWidth: 720,
      paddingHorizontal: 32,
    });
    // Grid screens (e.g. Quest) opt out and keep the full-bleed frame their grid math needs.
    expect(getAccountShellFrameMetrics(800, { tabletFluid: true })).toEqual({
      maxWidth: 1440,
      paddingHorizontal: 16,
    });
  });

  it("account shell footer offset > given desktop rail page > then the footer breaks back to the centered frame content edge", () => {
    // The desktop footer renders full-bleed (marginLeft: -horizontalPadding, width:
    // viewportWidth) inside the AccountPageShell's centered + padded frame. To line the
    // footer's centered content up with the page content above it, the slot must offset
    // by frameOffset + framePadding = (viewportWidth - frameMaxWidth)/2 + framePadding.
    // Rail pages mirror the navbar shell (maxWidth 1440, padding 80 at >=1200 / 56 below).
    expect(getAccountShellFooterHorizontalPadding(1440, { alignToNavbarShell: true })).toBe(120);
    expect(getAccountShellFooterHorizontalPadding(1600, { alignToNavbarShell: true })).toBe(200);
    expect(getAccountShellFooterHorizontalPadding(2048, { alignToNavbarShell: true })).toBe(424);
    expect(getAccountShellFooterHorizontalPadding(1100, { alignToNavbarShell: true })).toBe(56);
  });

  it("account shell footer offset > given desktop non-rail page (quest) > then the rail-only helper is not applied", () => {
    expect(getAccountShellFooterHorizontalPadding(1440, { alignToNavbarShell: false })).toBe(0);
    expect(getAccountShellFooterHorizontalPadding(2048, { alignToNavbarShell: false })).toBe(0);
  });

  it("account shell footer offset > given below the desktop breakpoint > then there is no offset (footer is hidden)", () => {
    expect(getAccountShellFooterHorizontalPadding(800, { alignToNavbarShell: true })).toBe(0);
    expect(getAccountShellFooterHorizontalPadding(800, { alignToNavbarShell: false })).toBe(0);
  });

  it("home search > given web mobile header > then mobile uses the same placeholder copy", () => {
    expect(webHomeSearchPlaceholder).toBe("Search brands, stores, products, or cashback");
  });

  it("home search > given clicked web mobile header > then mobile uses the same popular popover copy and rows", () => {
    expect(webHomeSearchPopularPanel).toEqual({
      title: "Popular right now",
      subtitle: "Hand-picked stores with standout cashback—tap a shop to explore.",
      resultsTitle: "Matching brands & products",
      resultsSubtitle: "From your search",
      noMatches: "No brands or products match that search—browse popular picks below.",
      actionLabel: "Shop Now",
      items: [
        expect.objectContaining({ brand: "Grocery Galaxy", cashback: "12.5%" }),
        expect.objectContaining({ brand: "Pocket Pantry", cashback: "10.0%" }),
        expect.objectContaining({ brand: "Orbit Airways", cashback: "8.5%" }),
        expect.objectContaining({ brand: "PixelPort", cashback: "6.5%" }),
        expect.objectContaining({ brand: "Glow Theory", cashback: "14.0%" }),
      ],
    });
  });

  it("home search > given typed search query > then mobile returns matching popular rows", () => {
    expect(getHomeSearchMatches("grocery").map((item) => item.brand)).toEqual(["Grocery Galaxy"]);
    expect(getHomeSearchMatches("12.5").map((item) => item.brand)).toEqual(["Grocery Galaxy"]);
  });

  it("home search > given unmatched typed search query > then mobile returns no rows for the no-match state", () => {
    expect(getHomeSearchMatches("gfhg")).toEqual([]);
  });

  it("home lower rails > given web Trending and CategoryHome > then mobile uses the same rail titles", () => {
    expect(webHomePromoSections.map((section) => section.title)).toEqual([
      "Trending Brands",
      "Travel Deals are Here!",
      "Makeup Must Have!",
    ]);
    expect(webHomePromoSections.every((section) => section.cardVariant === "brandLogoBadge")).toBe(
      true
    );
  });

  it("home top brands > given web Extra section > then mobile uses the same first six brand cards", () => {
    expect(webTopBrandCards.slice(0, 6)).toEqual([
      expect.objectContaining({ brand: "Grocery Galaxy", tint: "#6366F1" }),
      expect.objectContaining({ brand: "Pocket Pantry", tint: "#6366F1" }),
      expect.objectContaining({ brand: "Orbit Airways", tint: "#2563EB" }),
      expect.objectContaining({ brand: "PixelPort", tint: "#2563EB" }),
      expect.objectContaining({ brand: "Glow Theory", tint: "#6366F1" }),
      expect.objectContaining({ brand: "Bloom & Beam", tint: "#7F1D1D" }),
    ]);
  });

  it("home top brands > given MVP mock catalog > then mobile has thirty unique brands", () => {
    expect(webTopBrandCards).toHaveLength(30);
    expect(new Set(webTopBrandCards.map((card) => card.brand)).size).toBe(30);
  });

  it("home carousel dots > given paged Top Brands catalog > then dot count follows actual page count", () => {
    const mobileLayout = getResponsiveHomeLayoutMetrics(427);
    const desktopLayout = getResponsiveHomeLayoutMetrics(1440);

    expect(getCarouselDotCount(webTopBrandCards.length, mobileLayout.topBrandCardsPerPage)).toBe(8);
    expect(getCarouselDotCount(webTopBrandCards.length, desktopLayout.topBrandCardsPerPage)).toBe(
      3
    );
  });

  it("home carousel dots > given Travel Deals responsive rail > then mobile and desktop dots map to reachable pages", () => {
    const mobileLayout = getResponsiveHomeLayoutMetrics(455);
    const desktopLayout = getResponsiveHomeLayoutMetrics(1440);
    const travel = webHomePromoSections.find((section) => section.id === "travel");
    const desktopTravelCardsPerPage = desktopLayout.compactBrandColumns;

    expect(travel?.cards).toHaveLength(16);
    expect(getCarouselDotCount(travel?.cards.length ?? 0, mobileLayout.compactBrandCardsPerPage)).toBe(
      4
    );
    expect(
      getCarouselDotCount(travel?.cards.length ?? 0, desktopTravelCardsPerPage)
    ).toBe(2);
    expect(travel?.dotCount).toBe(2);
  });

  it("home carousel dots > given Makeup Must Have responsive rail > then mobile and desktop dots map to reachable pages", () => {
    const mobileLayout = getResponsiveHomeLayoutMetrics(455);
    const desktopLayout = getResponsiveHomeLayoutMetrics(1440);
    const makeup = webHomePromoSections.find((section) => section.id === "makeup");
    const desktopMakeupCardsPerPage = desktopLayout.compactBrandColumns;

    expect(makeup?.cards).toHaveLength(13);
    expect(getCarouselDotCount(makeup?.cards.length ?? 0, mobileLayout.compactBrandCardsPerPage)).toBe(
      4
    );
    expect(
      getCarouselDotCount(makeup?.cards.length ?? 0, desktopMakeupCardsPerPage)
    ).toBe(2);
    expect(makeup?.dotCount).toBe(2);
  });

  it("home carousel dots > given horizontal scroll offsets > then active dot follows the selected page", () => {
    const mobileLayout = getResponsiveHomeLayoutMetrics(427);
    const pageCount = getCarouselDotCount(
      webTopBrandCards.length,
      mobileLayout.topBrandCardsPerPage
    );

    expect(
      getCarouselActiveIndex({
        contentOffsetX: 0,
        pageCount,
        pageWidth: mobileLayout.contentWidth,
      })
    ).toBe(0);
    expect(
      getCarouselActiveIndex({
        contentOffsetX: mobileLayout.contentWidth * 2.02,
        pageCount,
        pageWidth: mobileLayout.contentWidth,
      })
    ).toBe(2);
    expect(
      getCarouselActiveIndex({
        contentOffsetX: mobileLayout.contentWidth * 100,
        pageCount,
        pageWidth: mobileLayout.contentWidth,
      })
    ).toBe(7);
  });

  it("discover product cards > given Next Product Discovery feed > then shared product card fixture matches the first products", () => {
    expect(webDiscoverProductCards.slice(0, 3)).toEqual([
      expect.objectContaining({
        brand: "Grocery Galaxy",
        priceLabel: "1,522 THB",
        title: "Grocery Galaxy",
      }),
      expect.objectContaining({
        brand: "Pocket Pantry",
        priceLabel: "1,569 THB",
        title: "Pocket Pantry",
      }),
      expect.objectContaining({
        brand: "Orbit Airways",
        priceLabel: "1,616 THB",
        title: "Orbit Airways",
      }),
    ]);
  });

  it("home typography > given Next web font and icon treatment > then mobile keeps the lighter text and stroke contract", () => {
    expect(typography).toMatchObject({
      family: '"DM Sans", Anuphan, system-ui, sans-serif',
      thaiFamily: 'Anuphan, "DM Sans", system-ui, sans-serif',
      sectionTitleWeight: "800",
      bodyWeight: "400",
      navLabelWeight: "400",
      iconStrokeWidth: 1.75,
    });
  });

  it("browse shortcuts > given web MobileBrowseShortcuts > then labels and routes match", () => {
    expect(webBrowseShortcuts).toEqual([
      { id: "all-brands", label: "All Brands", href: "/brand", icon: "shop" },
      { id: "all-shops", label: "All Shops", href: "/shops", icon: "shops" },
      {
        id: "product-discover",
        label: "Product Discovery",
        href: "/discover",
        icon: "promotion",
      },
      { id: "categories", label: "Categories", href: "/category", icon: "education" },
    ]);
  });

  it("bottom navigation > given web FooterMobile > then mobile uses the same items and wallet emphasis", () => {
    expect(webMobileBottomNavItems).toEqual([
      { label: "Home", href: "/", icon: "home" },
      { label: "GoGoLink", href: "/golink", icon: "golink" },
      { label: "Wallet", href: "/wallet", icon: "wallet", emphasized: true },
      { label: "Quest", href: "/quest", icon: "quest" },
      { label: "Profile", href: "/profile", icon: "profile" },
    ]);
  });

  it("desktop footer parity > given the Next footer contract > then Expo keeps the same sections links social and legal copy", () => {
    expect(webDesktopFooter).toMatchObject({
      logoLabel: "GoGoCash",
      cloudflare: {
        label: "Secured by",
        href: "https://www.cloudflare.com",
        asset: "cloudflare-logo",
      },
      copyrightTemplate: "© {year} Copyright - Made with 💚 by GoGoCash",
      disclaimer:
        "Cashback rates, merchant availability, and product features may change. GoGoCash does not provide financial, investment, or tax advice. Saving Plus and related offerings involve risk; read terms before participating. Past performance is not indicative of future results.",
    });
    expect(webDesktopFooter.sections).toEqual([
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
    ]);
    expect(webDesktopFooter.socialLinks.map((link) => link.label)).toEqual([
      "X",
      "Discord",
      "Telegram",
      "Line",
      "Threads",
      "LinkedIn",
      "GitHub",
      "YouTube",
    ]);
  });

  it("profile hub > given web ProfileMenu > then mobile renders the same real profile sections", () => {
    expect(profileHubSections).toEqual([
      "profileTitle",
      "walletSummaryHeroCard",
      "profileNavigationPanel",
      "logoutAction",
    ]);
    expect(profileHubSubNavItems).toEqual([
      { label: "Personal Information", href: "/profile/info" },
      { label: "My Rating Score", href: "/credit-score" },
      { label: "Withdraw Methods", href: "/method" },
      { label: "Account Setting", href: "/language" },
    ]);
    expect(profileHubMenuItems).toEqual([
      { label: "Profile", href: "/profile", activePrefix: "/profile" },
      { label: "Invite your Friends", href: "/referral", activePrefix: "/referral" },
      { label: "My Wallet", href: "/wallet", activePrefix: "/wallet" },
      { label: "GoGoPass", href: "/membership", activePrefix: "/membership" },
      { label: "Missing Orders", href: "/missing-orders", activePrefix: "/missing-orders" },
      { label: "Favorite Brands", href: "/favorite", activePrefix: "/favorite" },
      { label: "GoGoQuest History", href: "/quest/history", activePrefix: "/quest/history" },
      { label: "Age Verification", href: "/age-verification", activePrefix: "/age-verification" },
      { label: "Consent Preferences", href: "/privacy-center", activePrefix: "/privacy-center" },
      { label: "Privacy Policy", href: "/privacy-policy", activePrefix: "/privacy-policy" },
      { label: "Terms of Use", href: "https://gogocash.co/term-of-use", external: true },
      {
        label: "Terms of Service",
        href: "https://gogocash.co/terms-of-service",
        external: true,
      },
      { label: "Help Center", href: "https://lin.ee/7om5sAr", external: true },
      { label: "Connect with GoGoCash", href: "https://linktr.ee/gogocash", external: true },
    ]);
  });

  it("desktop footer grid > given web Footer breakpoints > then columns and gap collapse responsively", () => {
    // Web Footer.tsx: grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-16.
    // Columns collapse 3 -> 2 -> 1 and the gap steps 64 (lg) down to 32 on narrow widths.
    expect(getDesktopFooterGrid(1440)).toEqual({ columns: 3, gap: 64, columnBasis: "auto" });
    expect(getDesktopFooterGrid(820)).toEqual({ columns: 3, gap: 32, columnBasis: "auto" });
    expect(getDesktopFooterGrid(700)).toEqual({ columns: 2, gap: 32, columnBasis: "45%" });
    expect(getDesktopFooterGrid(400)).toEqual({ columns: 1, gap: 32, columnBasis: "100%" });

    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const footerSource = fs.readFileSync(
      path.resolve(__dirname, "../components/CustomerDesktopFooter.tsx"),
      "utf8"
    );
    expect(footerSource).toContain("getDesktopFooterGrid(viewportWidth)");
    expect(footerSource).toContain("getDesktopShellContentWidth(viewportWidth)");
    expect(footerSource).toContain("marginLeft: -horizontalPadding");
    expect(footerSource).toContain("topMargin?: number");
    expect(footerSource).toContain("topPadding?: number");
    expect(footerSource).toContain("marginTop: topMargin");
    expect(footerSource).toContain("paddingTop: topPadding");
    expect(footerSource).toContain("width: viewportWidth");
    expect(footerSource).not.toContain("paddingHorizontal: 32");
    expect(footerSource).toContain('flexWrap: "wrap"');
    expect(footerSource).toContain("gap: footerGrid.gap");
    expect(footerSource).toContain("flexBasis: footerGrid.columnBasis");
  });
});
