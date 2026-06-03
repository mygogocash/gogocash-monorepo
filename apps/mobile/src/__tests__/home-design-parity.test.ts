import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  getTopBrandHref,
  webCookieConsentBanner,
  webDesktopHeaderNavItems,
  webGoLinkFeature,
  webHomeHeroBanners,
  webHomePromoSections,
  webHomeSearchPopularPanel,
  webHomeSearchPlaceholder,
  webLocaleRegionPanel,
  mobileShellLayout,
  webMobileBottomNavItems,
  webTopBrandCards,
} from "@mobile/design/webDesignParity";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("Expo home design parity", () => {
  it("home design parity > given migrated Expo home > then includes staging mobile landmarks", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("HomeHeroBanners");
    expect(homeFile).toContain("BrandLogoOfferCard");
    expect(homeFile).toContain("CustomerMobileBottomNav");
    expect(homeFile).not.toContain('webHomeSectionOrder.includes("goLinkBanner")');
  });

  it("home desktop shell parity > given desktop Expo web > then renders the Next header, category nav, and cookie banner contract", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(webDesktopHeaderNavItems.map((item) => item.label)).toEqual([
      "Top Brands",
      "All Brands",
      "All Shops",
      "Product Discovery",
      "Travel",
      "Electronics",
      "Health & Beauty",
    ]);
    expect(webCookieConsentBanner.title).toBe("We use cookies in the delivery of our services.");
    expect(homeFile).toContain("DesktopHeader");
    expect(homeFile).toContain("DesktopCategoryNav");
    expect(homeFile).toContain("CustomerCookieConsentBanner");
    expect(homeFile).toContain("LineOfficialFab");
    expect(homeFile).toContain("logoMarkImage");
    const lineFabFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerLineOfficialFab.tsx"),
      "utf8"
    );

    expect(lineFabFile).toContain("lineOfficialFabImage");
    expect(lineFabFile).toContain("webLineOfficialFab.href");
    expect(homeFile).toContain("questHeaderImage");
    expect(homeFile).toContain("menuFireImage");
    expect(homeFile).toContain("StyleSheet.flatten([");
    expect(homeFile).toContain("styles.desktopCategoryNavItem");
    expect(homeFile).toContain("styles.desktopCategoryNavItemLead");
    // Desktop home renders a full-bleed header inside the `homeLayout.isDesktop`
    // branch so the header bar spans the full viewport (content stays capped at 1440).
    expect(homeFile).toContain("if (homeLayout.isDesktop) {");
    expect(homeFile).toContain("<CustomerDesktopHeader viewportWidth={width} />");
    expect(homeFile).toContain('webHomeSectionOrder.includes("browseShortcuts")');
    expect(homeFile).toContain("<BrowseShortcuts />");
    const cookieBannerFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerCookieConsentBanner.tsx"),
      "utf8"
    );

    expect(cookieBannerFile).toContain("webCookieConsentBanner.dismissedStorageKey");
    expect(cookieBannerFile).toContain("webCookieConsentBanner.dismissedEventName");
    expect(cookieBannerFile).toContain("webCookieConsentBanner.privacyPolicyLabel");
  });

  it("desktop navbar icons > given the Phosphor icon contract > then home and auth headers do not use legacy PNG category icons", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );
    const desktopHeaderFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerDesktopHeader.tsx"),
      "utf8"
    );
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(mobileRoot, "package.json"), "utf8")
    ) as { dependencies?: Record<string, string> };

    // Icons are standardized on phosphor for web + native, sourced through the
    // shared adapter (src/theme/icons.tsx) — screens never import an icon
    // library directly. The desktop category nav uses phosphor glyph components
    // (via the adapter), not the legacy PNG menu-bar icons.
    expect(packageJson.dependencies?.["phosphor-react-native"]).toBe("^2.3.1");
    for (const sourceFile of [homeFile, desktopHeaderFile]) {
      expect(sourceFile).toContain('from "@mobile/theme/icons"');
      expect(sourceFile).not.toContain("lucide-react-native");
      expect(sourceFile).not.toContain('from "phosphor-react-native');
      expect(sourceFile).toContain("Storefront");
      expect(sourceFile).toContain("SquaresFour");
      expect(sourceFile).toContain("Tag");
      expect(sourceFile).toContain("AirplaneTilt");
      expect(sourceFile).toContain("DeviceMobile");
      expect(sourceFile).toContain("Heartbeat");
      expect(sourceFile).toContain("desktopNavIcons");
      expect(sourceFile).not.toContain("menu-bar/electronics.png");
      expect(sourceFile).not.toContain("menu-bar/health.png");
      expect(sourceFile).not.toContain("menu-bar/promotion.png");
      expect(sourceFile).not.toContain("menu-bar/shop.png");
      expect(sourceFile).not.toContain("menu-bar/shops.png");
      expect(sourceFile).not.toContain("menu-bar/travel.png");
    }
  });

  it("desktop locale flow > given Next language region popover > then Expo header renders the same chooser contract", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );
    const desktopHeaderFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerDesktopHeader.tsx"),
      "utf8"
    );
    const localeControlFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerLocaleRegionControl.tsx"),
      "utf8"
    );

    expect(webLocaleRegionPanel).toMatchObject({
      ariaLabel: "Choose language and region",
      defaultLanguage: "en",
      defaultRegion: "TH",
      sections: {
        language: "LANGUAGE",
        region: "REGION",
      },
    });
    expect(webLocaleRegionPanel.languages).toEqual([
      { code: "en", flag: "🇬🇧", label: "English" },
      { code: "th", flag: "🇹🇭", label: "ไทย" },
    ]);
    expect(webLocaleRegionPanel.regions.map((region) => region.label)).toEqual([
      "Thailand",
      "Taiwan",
      "China",
      "Japan",
      "Singapore",
      "Malaysia",
      "Indonesia",
      "Philippines",
      "Vietnam",
      "Southeast Asia",
    ]);
    expect(localeControlFile).toContain("Animated.View");
    expect(localeControlFile).toContain("Animated.timing");
    expect(localeControlFile).toContain("motion.duration.base");
    expect(localeControlFile).toContain("motion.duration.fast");
    expect(localeControlFile).toContain("motion.easing.out");
    expect(localeControlFile).toContain("motion.easing.in");
    expect(localeControlFile).toContain("desktopLocalePopoverMotion");
    expect(localeControlFile).toContain("desktopLocaleIconMotion");
    expect(localeControlFile).toContain("setLocalePanelMounted(false)");
    expect(localeControlFile).toContain("webLocaleRegionPanel");
    expect(localeControlFile).toContain("accessibilityLabel={webLocaleRegionPanel.ariaLabel}");
    for (const sourceFile of [homeFile, desktopHeaderFile]) {
      expect(sourceFile).toContain("CustomerLocaleRegionControl");
      expect(sourceFile).toContain("localePanelOpen ? styles.desktopHeaderOverlayLayer : null");
    }
  });

  it("desktop sign-in button parity > given Next header uses a vector pill > then Expo does not render live text with mismatched font", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );
    const desktopHeaderFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerDesktopHeader.tsx"),
      "utf8"
    );
    const signInGraphicFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerSignInNavGraphic.tsx"),
      "utf8"
    );

    // The sign-in pill now renders a real localized label (tc("Sign in")) instead of a baked SVG text
    // path, so it switches with the locale — same brand pill (primary bg, white label, 48 tall).
    expect(signInGraphicFile).toContain('tc("Sign in")');
    expect(signInGraphicFile).toContain("backgroundColor: colors.primary");
    expect(signInGraphicFile).toContain("color: colors.white");
    expect(signInGraphicFile).toContain("height: 48");
    for (const sourceFile of [homeFile, desktopHeaderFile]) {
      expect(sourceFile).toContain("CustomerSignInNavGraphic");
      // The sign-in a11y label may be a literal or i18n-wrapped (tc("Sign in")) — both are valid.
      expect(sourceFile).toMatch(/accessibilityLabel=(?:"Sign in"|\{tc\("Sign in"\)\})/);
      expect(sourceFile).not.toContain("<Text style={styles.desktopSignInText}>Sign in</Text>");
      expect(sourceFile).not.toContain("desktopSignInText:");
    }
  });

  it("home desktop GoGoLink parity > given desktop home > then renders the Next banner between hero and Top Brands", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(webGoLinkFeature).toMatchObject({
      ctaLabel: "Paste and Go",
      inputPlaceholder: "Paste your product or shop link here",
      title: "GoGoLink – Easy to earn cashback by just copy, paste and shop!",
    });
    expect(homeFile).toContain("DesktopGoLinkBanner");
    expect(homeFile).toContain("homeLayout.isDesktop ? (");
    expect(homeFile).toContain("<DesktopGoLinkBanner");
    expect(homeFile.indexOf("<HomeHeroBanners homeLayout={homeLayout} />")).toBeLessThan(
      homeFile.indexOf("<DesktopGoLinkBanner")
    );
    expect(homeFile.indexOf("<DesktopGoLinkBanner")).toBeLessThan(
      homeFile.indexOf("<TopBrandSection homeLayout={homeLayout} />")
    );
    expect(homeFile).toContain("GoLinkGuidelineDialog");
    expect(homeFile).toContain("GoLinkResultDialog");
    expect(homeFile).toContain("isValidGoLinkUrl");
    expect(homeFile).toContain("golinkBannerIllustrationImage");
  });

  it("home design parity > given previous web hero layout > then keeps main and side banner contract", () => {
    expect(webHomeHeroBanners).toEqual([
      {
        id: "main-grocery-galaxy",
        asset: "home-banner",
        href: "/shop/brand-grocery-galaxy-1001",
        placement: "main",
      },
      {
        id: "main-pocket-pantry",
        asset: "home-side-watch",
        href: "/shop/brand-pocket-pantry-1002",
        placement: "main",
      },
      {
        id: "main-orbit-airways",
        asset: "home-side-grocery",
        href: "/shop/brand-orbit-airways-1003",
        placement: "main",
      },
      {
        id: "side-pixelport",
        asset: "home-side-watch",
        href: "/shop/brand-pixelport-1004",
        placement: "side",
      },
      {
        id: "side-bloom-beam",
        asset: "home-side-grocery",
        href: "/shop/brand-bloom-beam-1006",
        placement: "side",
      },
    ]);
  });

  it("home design parity > given production hero banners > then Expo keeps banners clickable and animated", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("HeroBannerLink");
    expect(homeFile).toContain("href={banner.href as never}");
    expect(homeFile).toContain("MotionPressable");
    expect(homeFile).toContain("styles.heroBannerLink");
    expect(homeFile).toContain("style={StyleSheet.flatten(style)}");
  });

  it("home design parity > given selected staging hero swiper > then Expo pages main banners horizontally with synced dots", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("activeHeroBannerPage");
    expect(homeFile).toContain(
      'webHomeHeroBanners.filter((banner) => banner.placement === "main")'
    );
    expect(homeFile).toContain("mainBanners.map");
    expect(homeFile).toContain("setHeroBannerWidth");
    expect(homeFile).toContain("styles.heroScroll");
    expect(homeFile).toContain("CarouselDots");
    expect(homeFile).toContain("activeIndex={activeHeroBannerPage}");
    expect(homeFile).toContain("snapToInterval={heroBannerWidth}");
    expect(homeFile).toContain("pagingEnabled");
    expect(homeFile).toContain("onScroll={Animated.event(");
  });

  it("home design parity > given top brands section > then uses real logo-style brand cards", () => {
    expect(webTopBrandCards.slice(0, 6)).toEqual([
      expect.objectContaining({ brand: "Grocery Galaxy", cashback: "12.5%" }),
      expect.objectContaining({ brand: "Pocket Pantry", cashback: "10.0%" }),
      expect.objectContaining({ brand: "Orbit Airways", cashback: "8.5%" }),
      expect.objectContaining({ brand: "PixelPort", cashback: "6.5%" }),
      expect.objectContaining({ brand: "Glow Theory", cashback: "14.0%" }),
      expect.objectContaining({ brand: "Bloom & Beam", cashback: "15.0%" }),
    ]);
  });

  it("home design parity > given selected staging lower block links > then hero and top brand cards target real mock shop IDs", () => {
    expect(webHomeHeroBanners.map((banner) => banner.href)).toEqual([
      "/shop/brand-grocery-galaxy-1001",
      "/shop/brand-pocket-pantry-1002",
      "/shop/brand-orbit-airways-1003",
      "/shop/brand-pixelport-1004",
      "/shop/brand-bloom-beam-1006",
    ]);
    expect(webHomeHeroBanners.filter((banner) => banner.placement === "main")).toHaveLength(3);
    expect(webHomeHeroBanners.filter((banner) => banner.placement === "side")).toHaveLength(2);
    expect(webTopBrandCards.slice(0, 6).map((card) => getTopBrandHref(card.brand))).toEqual([
      "/shop/brand-grocery-galaxy-1001",
      "/shop/brand-pocket-pantry-1002",
      "/shop/brand-orbit-airways-1003",
      "/shop/brand-pixelport-1004",
      "/shop/brand-glow-theory-1005",
      "/shop/brand-bloom-beam-1006",
    ]);
  });

  it("home design parity > given selected staging Top Brands block > then first carousel page visuals match", () => {
    expect(webTopBrandCards.slice(0, 4)).toEqual([
      expect.objectContaining({
        brand: "Grocery Galaxy",
        logoUri: "https://cdn.simpleicons.org/instacart/ffffff",
        showGrabCoupon: true,
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Pocket Pantry",
        logoUri: "https://cdn.simpleicons.org/instacart/ffffff",
        showGrabCoupon: true,
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Orbit Airways",
        logoUri: "https://cdn.simpleicons.org/americanairlines/ffffff",
        showGrabCoupon: false,
        tint: "#2563EB",
      }),
      expect.objectContaining({
        brand: "PixelPort",
        logoUri: "https://cdn.simpleicons.org/apple/ffffff",
        showGrabCoupon: false,
        tint: "#2563EB",
      }),
    ]);
  });

  it("home design parity > given staging top brands carousel > then Expo uses a two-row grid instead of a single horizontal row", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("useWindowDimensions");
    expect(homeFile).toContain("getResponsiveHomeLayoutMetrics");
    expect(homeFile).toContain("styles.brandGrid");
    expect(homeFile).toContain("activeIndex={activeTopBrandDot}");
    expect(homeFile).toContain("topBrandPages");
    expect(homeFile).toContain("homeLayout.topBrandCardsPerPage");
    expect(homeFile).toContain("homeLayout.contentWidth");
    expect(homeFile).not.toContain("contentContainerStyle={styles.brandCardRow}");
  });

  it("home design parity > given staging Top Brands mobile carousel > then Expo pages horizontally through card grids", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("horizontal");
    expect(homeFile).toContain("pagingEnabled");
    expect(homeFile).toContain("snapToInterval={homeLayout.contentWidth}");
    expect(homeFile).toContain('decelerationRate="fast"');
    expect(homeFile).toContain("disableIntervalMomentum");
    expect(homeFile).toContain("styles.topBrandScroll");
    expect(homeFile).toContain("styles.topBrandPage");
    expect(homeFile).toContain("topBrandPages.map");
    expect(homeFile).not.toContain("webTopBrandCards.slice(0, 6)");
  });

  it("home design parity > given desktop and mobile web widths > then Expo uses responsive measured layout values", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("homeLayout.showBottomNav");
    expect(homeFile).toContain("homeLayout.contentMaxWidth");
    expect(homeFile).toContain("homeLayout.compactBrandCardWidth");
    expect(homeFile).toContain("homeLayout.pageBottomPadding");
    expect(homeFile).not.toContain('width: "31.4%"');
    expect(homeFile).not.toContain("paddingBottom: mobileShellLayout.bottomNavClearance + 24");
  });

  it("home design parity > given bottom nav contract > then renders five staging nav items", () => {
    expect(webMobileBottomNavItems.map((item) => item.label)).toEqual([
      "Home",
      "GoGoLink",
      "Wallet",
      "Quest",
      "Profile",
    ]);
    expect(webMobileBottomNavItems.find((item) => item.label === "Wallet")).toMatchObject({
      emphasized: true,
    });
  });

  it("home design parity > given Expo Router asChild links > then root Pressable styles are flattened", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile.match(/<Link asChild[\s\S]*?<Pressable\b[^>]*\n\s*style=\{\[/g)).toEqual(null);
    expect(homeFile).not.toContain("style={[styles.brandCard");
  });

  it("home design parity > given home navigation > then uses icon components instead of placeholder glyph maps", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain('from "@mobile/theme/icons"');
    expect(homeFile).not.toContain("lucide-react-native");
    expect(homeFile).toContain("ShortcutIcon");
    expect(homeFile).toContain("BottomNavIcon");
    expect(homeFile).not.toContain("getShortcutGlyph");
    expect(homeFile).not.toContain("getBottomNavGlyph");
  });

  it("home design parity > given staging search copy > then renders the shared placeholder", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(webHomeSearchPlaceholder).toContain("brands, stores, products");
    expect(homeFile).toContain("webHomeSearchPlaceholder");
    expect(homeFile).toContain(
      'accessibilityLabel={tc("Search brands, stores, products, and cashback offers")}'
    );
    expect(homeFile).toContain('nativeID="home-search-input"');
    expect(homeFile).not.toContain("Search shops, brands, cashback");
  });

  it("home design parity > given selected staging search click state > then renders popular popover contract", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(webHomeSearchPopularPanel).toMatchObject({
      title: "Popular right now",
      subtitle: "Hand-picked stores with standout cashback—tap a shop to explore.",
      resultsTitle: "Matching brands & products",
      resultsSubtitle: "From your search",
      noMatches: "No brands or products match that search—browse popular picks below.",
      actionLabel: "Shop Now",
    });
    expect(webHomeSearchPopularPanel.items.map((item) => item.brand)).toEqual([
      "Grocery Galaxy",
      "Pocket Pantry",
      "Orbit Airways",
      "PixelPort",
      "Glow Theory",
    ]);
    expect(webHomeSearchPopularPanel.items.map((item) => item.cashback)).toEqual([
      "12.5%",
      "10.0%",
      "8.5%",
      "6.5%",
      "14.0%",
    ]);
    expect(homeFile).toContain("TextInput");
    expect(homeFile).toContain("searchPopoverOpen");
    expect(homeFile).toContain("openSearchPopover");
    expect(homeFile).toContain("onPress={openSearchPopover}");
    expect(homeFile).toContain("onPressIn={openSearchPopover}");
    expect(homeFile).toContain("HomeSearchPopularPopover");
    expect(homeFile).toContain("query={searchQuery}");
    expect(homeFile).toContain("getHomeSearchMatches(query)");
    expect(homeFile).toContain("searchNoMatchCard");
    expect(homeFile).toContain("searchResultsHeading");
    expect(homeFile).toContain('variant="compact"');
    expect(homeFile).toContain('variant="large"');
    expect(homeFile).toContain("webHomeSearchPopularPanel");
    expect(homeFile).toContain("mobileShellLayout.searchPopoverActionMinWidth");
    expect(homeFile).toContain("mobileShellLayout.searchPopoverResultRowGap");
    expect(homeFile).not.toContain("minWidth: 122");
  });

  it("home design parity > given selected staging search focus state > then Expo suppresses the browser focus outline", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("webSearchInputFocusReset");
    expect(homeFile).toContain("outlineStyle");
    expect(homeFile).toContain("outlineWidth");
    expect(homeFile).toContain("style={[styles.searchInput, webSearchInputFocusReset]}");
  });

  it("home design parity > given lower staging home rails > then Expo renders the same section titles", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(webHomePromoSections.map((section) => section.title)).toEqual([
      "Trending Brands",
      "Travel Deals are Here!",
      "Makeup Must Have!",
    ]);
    expect(homeFile).toContain("webHomePromoSections");
    expect(homeFile).not.toContain("Recommended Shops");
    expect(homeFile).not.toContain("Travel cashback stores");
    expect(homeFile).not.toContain("Beauty store rewards");
  });

  it("home design parity > given selected staging Trending Brands block > then compact card visuals match", () => {
    const trending = webHomePromoSections.find((section) => section.id === "trending");

    expect(trending?.dotCount).toBe(6);
    expect(trending?.cards.slice(0, 6)).toEqual([
      expect.objectContaining({
        brand: "Grocery Galaxy",
        logoUri: "https://cdn.simpleicons.org/instacart/ffffff",
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Pocket Pantry",
        logoUri: "https://cdn.simpleicons.org/instacart/ffffff",
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Orbit Airways",
        logoUri: "https://cdn.simpleicons.org/americanairlines/ffffff",
        tint: "#2563EB",
      }),
      expect.objectContaining({
        brand: "PixelPort",
        logoUri: "https://cdn.simpleicons.org/apple/ffffff",
        tint: "#2563EB",
      }),
      expect.objectContaining({
        brand: "Glow Theory",
        logoUri: "https://cdn.simpleicons.org/shopify/ffffff",
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Bloom & Beam",
        logoUri: "https://cdn.simpleicons.org/nike/ffffff",
        tint: "#7F1D1D",
      }),
    ]);
  });

  it("home design parity > given selected staging Travel Deals block > then compact card visuals match", () => {
    const travel = webHomePromoSections.find((section) => section.id === "travel");

    expect(travel?.dotCount).toBe(4);
    expect(travel?.cards.slice(0, 6)).toEqual([
      expect.objectContaining({
        brand: "Orbit Airways",
        logoUri: "https://cdn.simpleicons.org/americanairlines/ffffff",
        tint: "#2563EB",
      }),
      expect.objectContaining({
        brand: "Nova Travel Club",
        logoUri: "https://cdn.simpleicons.org/tripadvisor/ffffff",
        tint: "#1D4ED8",
      }),
      expect.objectContaining({
        brand: "Horizon Escapes",
        logoUri: "https://cdn.simpleicons.org/meta/ffffff",
        tint: "#1F3E5F",
      }),
      expect.objectContaining({
        brand: "CloudNine Travel",
        logoUri: "https://cdn.simpleicons.org/tripadvisor/ffffff",
        tint: "#EAB308",
      }),
      expect.objectContaining({
        brand: "StayMint Hotels",
        logoUri: "https://cdn.simpleicons.org/airbnb/ffffff",
        tint: "#0EA5E9",
      }),
      expect.objectContaining({
        brand: "Trailhead Outfitters",
        logoUri: "https://cdn.simpleicons.org/tripadvisor/ffffff",
        tint: "#0F766E",
      }),
    ]);
  });

  it("home design parity > given selected staging Travel Deals rail > then Travel data provides enough cards for every declared pagination dot", () => {
    const travel = webHomePromoSections.find((section) => section.id === "travel");
    const mobileCardsPerPage = mobileShellLayout.compactBrandMobileColumns * 2;

    expect(travel?.cards).toHaveLength((travel?.dotCount ?? 0) * mobileCardsPerPage);
  });

  it("home design parity > given selected staging Makeup Must Have block > then compact card visuals match", () => {
    const makeup = webHomePromoSections.find((section) => section.id === "makeup");

    expect(makeup?.dotCount).toBe(3);
    expect(makeup?.cards.slice(0, 6)).toEqual([
      expect.objectContaining({
        brand: "Bloom & Beam",
        logoUri: "https://cdn.simpleicons.org/nike/ffffff",
        tint: "#7F1D1D",
      }),
      expect.objectContaining({
        brand: "Mint Mirror",
        logoUri: "https://cdn.simpleicons.org/target/ffffff",
        tint: "#0EA5E9",
      }),
      expect.objectContaining({
        brand: "Pure Ritual",
        logoUri: "https://cdn.simpleicons.org/shopee/ffffff",
        tint: "#0F766E",
      }),
      expect.objectContaining({
        brand: "Luxe Lane Beauty",
        logoUri: "https://cdn.simpleicons.org/shopify/ffffff",
        tint: "#F97316",
      }),
      expect.objectContaining({
        brand: "Amber Apothecary",
        logoFallbackText: "Amber Apothecary",
        logoUri: "https://cdn.simpleicons.org/target/ffffff",
        tint: "#7F1D1D",
      }),
      expect.objectContaining({
        brand: "Pearl Polish",
        logoUri: "https://cdn.simpleicons.org/shopee/ffffff",
        tint: "#6366F1",
      }),
    ]);
  });

  it("home design parity > given selected staging Makeup Must Have rail > then Health Beauty data mirrors category query order", () => {
    const makeup = webHomePromoSections.find((section) => section.id === "makeup");

    expect(makeup?.cards.map((card) => card.brand)).toEqual([
      "Bloom & Beam",
      "Mint Mirror",
      "Pure Ritual",
      "Luxe Lane Beauty",
      "Amber Apothecary",
      "Pearl Polish",
      "Brush & Bloom",
      "Aurum Glow",
      "Noble Nurture",
      "Dew Drop Labs",
      "Lush Legacy",
      "Harbor Herbs",
      "Vitaline Spa",
    ]);
    expect(getTopBrandHref("Pearl Polish")).toBe("/shop/brand-pearl-polish-1037");
    expect(getTopBrandHref("Vitaline Spa")).toBe("/shop/brand-vitaline-spa-1068");
  });

  it("home design parity > given lower staging home rails > then Expo uses compact brand logo cards", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("CompactBrandLogoOfferCard");
    expect(homeFile).toContain("activeIndex={activePromoDot}");
    expect(homeFile).toContain("compactBrandLogoFallback");
    expect(homeFile).toContain("sectionDotCount");
    expect(homeFile).toContain("const sectionDotCount = homeLayout.isDesktop");
    expect(homeFile).toContain("? promoPages.length");
    expect(homeFile).toContain("sectionDotCount > 1 ?");
    expect(homeFile).toContain("count={sectionDotCount}");
    expect(homeFile).not.toContain("offerCard:");
    expect(homeFile).not.toContain("cardCategory:");
  });

  it("home design parity > given selected staging lower promo rail > then Expo pages compact cards horizontally", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );
    const firstPageCardCount = mobileShellLayout.compactBrandMobileColumns * 2;

    expect(webHomePromoSections.every((section) => section.cards.length > firstPageCardCount)).toBe(
      true
    );
    expect(homeFile).toContain("chunkCompactBrandCards");
    expect(homeFile).toContain("promoPages.map");
    expect(homeFile).toContain("homeLayout.compactBrandCardsPerPage");
    expect(homeFile).toContain("styles.promoScroll");
    expect(homeFile).toContain("styles.promoPage");
    expect(homeFile).toContain("styles.promoPagerContent");
    expect(homeFile).toContain("snapToInterval={homeLayout.contentWidth}");
    expect(homeFile).not.toContain("<View style={styles.compactBrandGrid}>");
  });

  it("home design parity > given lower promo rail viewport > then the scroller is constrained to measured content width", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("style={[styles.promoScroll, { width: homeLayout.contentWidth }]}");
  });

  it("home design parity > given lower staging section titles > then long titles can wrap like Next.js", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).not.toContain("<Text numberOfLines={1} style={styles.sectionTitleSmall}>");
    expect(homeFile).toMatch(/sectionTitleSmall:\s*\{[^}]*lineHeight:\s*34,/);
    expect(homeFile).toContain("flexShrink: 1");
  });

  it("home design parity > given staging mobile icon weight > then Expo avoids heavier placeholder strokes", () => {
    const homeFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("homeIconStrokeWidth");
    expect(homeFile).not.toContain("strokeWidth={2.4}");
    expect(homeFile).not.toContain("strokeWidth={2.6}");
    expect(homeFile).not.toContain("strokeWidth={3}");
  });
});
