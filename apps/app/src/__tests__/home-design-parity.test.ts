import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { readHomeRouter, readHomeSources } from "../test-support/homeSource";

import {
  getResponsiveHomeLayoutMetrics,
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

function readHomeFile() {
  return readHomeSources(mobileRoot);
}

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("Expo home design parity", () => {
  it("home design parity > given migrated Expo home > then includes staging mobile landmarks", () => {
    const homeFile = readHomeFile();
    const homeRouter = readHomeRouter(mobileRoot);

    expect(homeFile).toContain("HomeHeroBanners");
    // Top Brands renders the shared BrandCard at its large size.
    expect(homeFile).toContain("BrandCard");
    expect(homeFile).toContain('size="L"');
    const brandCardFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/BrandCard.tsx"),
      "utf8"
    );
    expect(brandCardFile).toMatch(/heartCircle:\s*\{[\s\S]*?height: 28,[\s\S]*?width: 28,/);
    expect(homeFile).toContain("styles.desktopScrollContent");
    expect(homeRouter).toContain("desktopFooterCap");
    expect(homeRouter).toContain("horizontalPadding={desktopFooterHorizontalOffset}");
    expect(homeRouter).not.toContain("topMargin={0}");
    expect(homeFile).toContain("height: homeLayout.topBrandGridHeight");
    expect(homeFile).toContain("height: homeLayout.topBrandGridHeight");
    expect(homeFile).toContain("CustomerMobileBottomNav");
    expect(homeFile).not.toContain('webHomeSectionOrder.includes("goLinkBanner")');
  });

  it("home desktop shell parity > given desktop Expo web > then renders the Next header, category nav, and cookie banner contract", () => {
    const homeFile = readHomeFile();
    const desktopHeaderFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerDesktopHeader.tsx"),
      "utf8"
    );

    // Founder request 2026-07-22: Explore Shops + Explore Products hidden from the nav,
    // replaced by the Digital Services + Fashion category shortcuts.
    expect(webDesktopHeaderNavItems.map((item) => item.label)).toEqual([
      "Top Brands",
      "Explore Brand",
      "Digital Services",
      "Fashion",
      "Travel",
      "Electronics",
      "Health & Beauty",
    ]);
    expect(webCookieConsentBanner.title).toBe("We use cookies in the delivery of our services.");
    expect(homeFile).toContain("CustomerDesktopHeader");
    expect(homeFile).toContain("CustomerCookieConsentBanner");
    expect(homeFile).toContain("LineOfficialFab");
    expect(desktopHeaderFile).toContain("CustomerDesktopBrandLink");
    const desktopBrandLinkFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerDesktopBrandLink.tsx"),
      "utf8"
    );
    expect(desktopBrandLinkFile).toContain("logoMarkImage");
    const lineFabFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerLineOfficialFab.tsx"),
      "utf8"
    );

    expect(lineFabFile).toContain("lineOfficialFabImage");
    expect(lineFabFile).toContain("webLineOfficialFab.href");
    expect(desktopHeaderFile).toContain("questHeaderImage");
    // #483 — Top Brands uses Phosphor Fire at 16px like other nav icons.
    expect(desktopHeaderFile).toContain("fire: Fire");
    expect(desktopHeaderFile).toContain("size={16}");
    expect(desktopHeaderFile).not.toContain("menuFireImage");
    expect(desktopHeaderFile).not.toContain("desktopCategoryNavItemLead");
    expect(homeFile).toContain("StyleSheet.flatten([");
    expect(desktopHeaderFile).toContain("styles.desktopCategoryNavItem");
    // Desktop home renders a full-bleed header inside the `homeLayout.isDesktop`
    // branch so the header bar spans the full viewport (content stays capped at 1440).
    expect(homeFile).toContain("if (homeLayout.isDesktop) {");
    expect(homeFile).toContain("<CustomerDesktopHeader");
    expect(homeFile).toContain("viewportWidth={width}");
    expect(homeFile).toContain('webHomeSectionOrder.includes("browseShortcuts")');
    expect(homeFile).toContain("<BrowseShortcuts />");
    const cookieBannerFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerCookieConsentBanner.tsx"),
      "utf8"
    );
    const cookieConsentStorageFile = fs.readFileSync(
      path.join(mobileRoot, "src/pdpa/cookieConsentStorage.ts"),
      "utf8"
    );

    expect(cookieConsentStorageFile).toContain("webCookieConsentBanner.dismissedStorageKey");
    expect(cookieBannerFile).toContain("webCookieConsentBanner.dismissedEventName");
    expect(cookieBannerFile).toContain("webCookieConsentBanner.privacyPolicyLabel");
  });

  it("desktop navbar icons > given the Phosphor icon contract > then home and auth headers do not use legacy PNG category icons", () => {
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
    expect(packageJson.dependencies?.["phosphor-react-native"]).toBe("^3.0.6");
    for (const sourceFile of [desktopHeaderFile]) {
      expect(sourceFile).toContain('from "@mobile/theme/icons"');
      expect(sourceFile).not.toContain("lucide-react-native");
      expect(sourceFile).not.toContain('from "phosphor-react-native');
      expect(sourceFile).toContain("Storefront");
      // Digital Services + Fashion nav shortcuts use the Cloud + Shirt phosphor glyphs
      // (Explore Shops "SquaresFour" + Explore Products "Tag" were removed with those items).
      expect(sourceFile).toContain("Cloud");
      expect(sourceFile).toContain("Shirt");
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
    expect(localeControlFile).toContain("resolveLocaleGlobeColor");
    expect(fs.readFileSync(path.join(mobileRoot, "src/theme/localeGlobeColor.ts"), "utf8")).toContain(
      "pickThemed(colors, colors.accent, colors.white)",
    );
    expect(localeControlFile).toContain("color: colors.ink");
    expect(localeControlFile).toContain('pickThemed(colors, "#E8FAF5", colors.primarySoft)');
    expect(localeControlFile).toContain("color: colors.primary");
    for (const sourceFile of [desktopHeaderFile]) {
      expect(sourceFile).toContain("CustomerLocaleRegionControl");
      expect(sourceFile).toContain("CustomerProfileNav");
      expect(sourceFile).toContain(
        "localePanelOpen || profilePanelOpen ? styles.desktopHeaderOverlayLayer : null"
      );
    }
  });

  it("desktop sign-in button parity > given Next header uses a vector pill > then Expo does not render live text with mismatched font", () => {
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
    for (const sourceFile of [desktopHeaderFile]) {
      expect(sourceFile).toContain("CustomerSignInNavGraphic");
      // The sign-in a11y label may be a literal or i18n-wrapped (tc("Sign in")) — both are valid.
      expect(sourceFile).toMatch(/accessibilityLabel=(?:"Sign in"|\{tc\("Sign in"\)\})/);
      expect(sourceFile).not.toContain("<Text style={styles.desktopSignInText}>Sign in</Text>");
      expect(sourceFile).not.toContain("desktopSignInText:");
    }
  });

  it("home desktop GoGoLink parity > given desktop home > then renders the Next banner between hero and Top Brands", () => {
    const homeFile = readHomeFile();

    expect(webGoLinkFeature).toMatchObject({
      ctaLabel: "Paste and Go",
      inputPlaceholder: "Paste your product or shop link here",
      title: "GoGoLink – Easy to earn cashback by just copy, paste and shop!",
    });
    expect(homeFile).toContain("DesktopGoLinkBanner");
    expect(homeFile).toContain("homeLayout.isDesktop && isGoLinkEnabled() ? (");
    expect(homeFile).toContain("MobileTabletHomeHeader");
    expect(homeFile).toContain('variant="mobileTabletHeader"');
    expect(homeFile).toContain("mobile-tablet-golink-banner");
    expect(homeFile).toContain("mobileTabletContentSheet");
    expect(homeFile).toContain("<DesktopGoLinkBanner");
    expect(homeFile.indexOf("<HomeHeroBanners homeLayout={homeLayout} />")).toBeLessThan(
      homeFile.indexOf("<DesktopGoLinkBanner")
    );
    expect(homeFile.indexOf("<DesktopGoLinkBanner")).toBeLessThan(
      homeFile.indexOf("<TopBrandSection")
    );
    expect(homeFile).toContain("GoLinkGuidelineDialog");
    expect(homeFile).toContain("GoLinkResultDialog");
    expect(homeFile).toContain("isValidGoLinkUrl");
    expect(homeFile).toContain("desktopGoLinkSteps");
    expect(homeFile).toMatch(
      /desktopGoLinkHeadlineRow: \{\s+alignItems: "flex-start",\s+flexDirection: "column",\s+gap: 12,\s+\}/,
    );
    expect(homeFile).toMatch(
      /desktopGoLinkSteps: \{\s+alignItems: "center",\s+flexDirection: "row",\s+flexShrink: 1,\s+flexWrap: "wrap",\s+gap: 8,\s+maxWidth: "100%",\s+\}/,
    );
  });

  it("home design parity > given previous web hero layout > then keeps main and side banner contract", () => {
    expect(webHomeHeroBanners).toEqual([
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
    ]);
  });

  it("home design parity > given production hero banners > then Expo keeps banners clickable and animated", () => {
    const homeFile = readHomeFile();

    expect(homeFile).toContain("HeroBannerLink");
    expect(homeFile).toContain("href={banner.href as never}");
    expect(homeFile).toContain("MotionPressable");
    expect(homeFile).toContain("styles.heroBannerLink");
    expect(homeFile).toContain("style={StyleSheet.flatten(style)}");
  });

  it("home design parity > given selected staging hero swiper > then Expo pages main banners horizontally with synced dots", () => {
    const homeFile = readHomeFile();

    expect(homeFile).toContain("activeHeroBannerPage");
    // Banners now flow through useCustomerAccountResource + resolveHomeHeroBanners
    // (admin-configurable in backend mode; identical to webHomeHeroBanners in
    // fixtures mode). The main/side split is preserved on the resolved list.
    expect(homeFile).toContain(
      'heroBanners.filter((banner) => banner.placement === "main")'
    );
    expect(homeFile).toContain("heroCarouselSlides.map");
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
        logoUri: "https://cdn.simpleicons.org/instacart",
        showGrabCoupon: true,
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Pocket Pantry",
        logoUri: "https://cdn.simpleicons.org/instacart",
        showGrabCoupon: true,
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Orbit Airways",
        logoUri: "https://cdn.simpleicons.org/americanairlines",
        showGrabCoupon: false,
        tint: "#2563EB",
      }),
      expect.objectContaining({
        brand: "PixelPort",
        logoUri: "https://cdn.simpleicons.org/apple",
        showGrabCoupon: false,
        tint: "#2563EB",
      }),
    ]);
  });

  it("home design parity > given dark mode > then Top Brands coupon chip adapts via pickThemed", () => {
    const desktopHeaderFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerDesktopHeader.tsx"),
      "utf8",
    );
    const brandCardFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/BrandCard.tsx"),
      "utf8",
    );

    expect(brandCardFile).toMatch(
      /couponChip:\s*\{[\s\S]*?backgroundColor: pickThemed\(colors, "rgba\(255,255,255,0\.92\)", colors\.card\)/,
    );
    expect(brandCardFile).toMatch(
      /heartCircle:\s*\{[\s\S]*?backgroundColor: pickThemed\(colors, "rgba\(255,255,255,0\.92\)", colors\.card\)/,
    );
    expect(desktopHeaderFile).toContain("backgroundColor: surfaces.localeButtonBackground");
  });

  it("home design parity > given staging top brands carousel > then Expo uses a two-row grid instead of a single horizontal row", () => {
    const homeFile = readHomeFile();

    expect(homeFile).toContain("useWindowDimensions");
    expect(homeFile).toContain("getResponsiveHomeLayoutMetrics");
    expect(homeFile).toContain("styles.brandGrid");
    // #498 — Top Brands is one continuous column-major group now, so there are no pages
    // and no dots. The two-row grid itself is unchanged.
    expect(homeFile).toContain("topBrandColumns");
    expect(homeFile).toContain("homeLayout.topBrandRowsPerPage");
    expect(homeFile).toContain("homeLayout.contentWidth");
    expect(homeFile).not.toContain("contentContainerStyle={styles.brandCardRow}");
  });

  it("home design parity > given staging Top Brands carousel > then desktop pages while mobile free-scrolls column flow", () => {
    // Founder feedback 2026-07-11 gated snapping so mobile flowed columns freely while
    // desktop kept a paged group. #498 removed the paged group entirely: the page boundary
    // was the visible gap between cards, so BOTH now scroll one continuous column-major
    // group and the dots became a proportional progress rail.
    const homeFile = readHomeFile();

    expect(homeFile).toContain("horizontal");
    expect(homeFile).toContain("getPromoSectionLayoutMode(homeLayout.isDesktop, topBrands.length)");
    expect(homeFile).not.toContain("snapToInterval={isPager ? homeLayout.topBrandGroupWidth : undefined}");
    expect(homeFile).not.toContain("topBrandPages.map");
    expect(homeFile).toContain("styles.topBrandScroll");
    expect(homeFile).toContain("topBrandColumns.map");
    expect(homeFile).toContain("chunkTopBrandCards(topBrands, homeLayout.topBrandRowsPerPage)");
    expect(homeFile).not.toContain("webTopBrandCards.slice(0, 6)");
  });

  it("home design parity > given desktop and mobile web widths > then Expo uses responsive measured layout values", () => {
    const homeFile = readHomeFile();

    expect(homeFile).toContain("homeLayout.showBottomNav");
    expect(homeFile).toContain("homeLayout.contentMaxWidth");
    expect(homeFile).toContain("homeLayout.topBrandCardWidth");
    expect(homeFile).toContain("homeLayout.topBrandCardHeight");
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
    const homeFile = readHomeFile();

    expect(homeFile.match(/<Link asChild[\s\S]*?<Pressable\b[^>]*\n\s*style=\{\[/g)).toEqual(null);
    expect(homeFile).not.toContain("style={[styles.brandCard");
  });

  it("home design parity > given home navigation > then uses icon components instead of placeholder glyph maps", () => {
    const homeFile = readHomeFile();

    expect(homeFile).toContain('from "@mobile/theme/icons"');
    expect(homeFile).not.toContain("lucide-react-native");
    expect(homeFile).toContain("ShortcutIcon");
    expect(homeFile).toContain("BottomNavIcon");
    expect(homeFile).not.toContain("getShortcutGlyph");
    expect(homeFile).not.toContain("getBottomNavGlyph");
  });

  it("home design parity > given staging search copy > then renders the shared placeholder", () => {
    const homeFile = readHomeFile();

    expect(webHomeSearchPlaceholder).toContain("brands, stores, products");
    expect(homeFile).toContain("webHomeSearchPlaceholder");
    expect(homeFile).toContain(
      'accessibilityLabel={tc("Search brands, stores, products, and cashback offers")}'
    );
    expect(homeFile).toContain('nativeID="home-search-input-hidden"');
    expect(homeFile).not.toContain("<View style={styles.mobileTabletHeaderSearchBox}>");
    expect(homeFile).not.toContain("Search shops, brands, cashback");
  });

  it("home design parity > given selected staging search click state > then renders popular popover contract", () => {
    const homeFile = readHomeFile();

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
    expect(homeFile).toContain("openMobileSearch");
    expect(homeFile).toContain('pathname: "/search"');
    expect(homeFile).toContain("params: { q: normalizedQuery }");
    expect(homeFile).toContain("onPress={openMobileSearch}");
    expect(homeFile).toContain("onPressIn={openMobileSearch}");
    expect(homeFile).toContain("HomeSearchPopularPopover");
    expect(homeFile).toContain("query={searchQuery}");
    expect(homeFile).toContain("useOfferSearch");
    expect(homeFile).toContain("searchNoMatchCard");
    expect(homeFile).toContain("searchResultsHeading");
    expect(homeFile).toContain('variant="compact"');
    expect(homeFile).toContain('variant="large"');
    expect(homeFile).toContain("webHomeSearchPopularPanel");
    expect(homeFile).toContain("mobileShellLayout.searchPopoverActionMinWidth");
    expect(homeFile).toContain("mobileShellLayout.searchPopoverResultRowGap");
    expect(homeFile).not.toContain("minWidth: 122");
  });

  it("mounts the GoLink guideline + result dialogs on the MOBILE branch too", () => {
    // User report 2026-07-10: tapping the GoLink banner's (i) on a phone did
    // nothing. The handler set desktopGoLinkGuidelineOpen, but the dialogs
    // were only mounted in the desktop return branch — the mobile tree never
    // rendered them. Both dialogs must appear in BOTH return branches.
    const homeScreenSource = readHomeFile();
    expect((homeScreenSource.match(/<GoLinkGuidelineDialog/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((homeScreenSource.match(/<GoLinkResultDialog/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("centers the GoLink sheet toggle with alignSelf — left:50% mis-centers on native Yoga", () => {
    // The collapse caret sat off-center on the Android app: RN resolves
    // `left: "50%"` + negative margin differently from web. `alignSelf:
    // "center"` on the absolutely-positioned child centers on both platforms.
    const styles = readMobileFile("src/screens/home/customerHomeStyles.ts");
    const toggleBlock =
      styles.match(/mobileTabletSheetToggleButton:\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
    expect(toggleBlock).toContain('alignSelf: "center"');
    expect(toggleBlock).not.toContain('left: "50%"');
    expect(toggleBlock).not.toContain("marginLeft");
  });

  it("home search popover typography > given secondary copy and actions > then uses normal weight", () => {
    const styles = readMobileFile("src/screens/home/customerHomeStyles.ts");
    const subtitleBlock =
      styles.match(/searchPopoverSubtitle:\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
    const captionBlock =
      styles.match(/searchResultCaption:\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
    const actionBlock =
      styles.match(/searchResultActionText:\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";

    expect(subtitleBlock).toContain("fontWeight: typography.bodyWeight");
    expect(captionBlock).toContain("fontWeight: typography.bodyWeight");
    expect(actionBlock).toContain("fontWeight: typography.bodyWeight");
    expect(actionBlock).not.toContain('fontWeight: "700"');
  });

  it("home design parity > given selected staging search focus state > then Expo suppresses the browser focus outline", () => {
    const homeFile = readHomeFile();

    expect(homeFile).toContain("webSearchInputFocusReset");
    expect(homeFile).toContain("outlineStyle");
    expect(homeFile).toContain("outlineWidth");
    expect(homeFile).toContain("style={[styles.searchInput, webSearchInputFocusReset]}");
  });

  it("home design parity > given lower staging home rails > then Expo renders the same section titles", () => {
    const homeFile = readHomeFile();

    expect(webHomePromoSections.map((section) => section.title)).toEqual([
      "Trending Brands",
      "Travel Deals are Here!",
      "Makeup Must Have!",
    ]);
    expect(homeFile).toContain("webHomePromoSections");
    expect(homeFile).toContain('resourceId: "brandCatalog"');
    // Homepage rails now prefer the admin-curated /offer/landing-rails config,
    // falling back to the webHomePromoSections fixture (see resolveApiLandingRails).
    expect(homeFile).toContain('resourceId: "landingRails"');
    expect(homeFile).toContain("resolveApiLandingRails");
    expect(homeFile).not.toContain("Recommended Shops");
    expect(homeFile).not.toContain("Travel cashback stores");
    expect(homeFile).not.toContain("Beauty store rewards");
  });

  it("home design parity > given selected staging Trending Brands block > then compact card visuals match", () => {
    const trending = webHomePromoSections.find((section) => section.id === "trending");

    expect(trending?.dotCount).toBe(1);
    expect(trending?.cards.slice(0, 6)).toEqual([
      expect.objectContaining({
        brand: "Grocery Galaxy",
        logoUri: "https://cdn.simpleicons.org/instacart",
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Pocket Pantry",
        logoUri: "https://cdn.simpleicons.org/instacart",
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Orbit Airways",
        logoUri: "https://cdn.simpleicons.org/americanairlines",
        tint: "#2563EB",
      }),
      expect.objectContaining({
        brand: "PixelPort",
        logoUri: "https://cdn.simpleicons.org/apple",
        tint: "#2563EB",
      }),
      expect.objectContaining({
        brand: "Glow Theory",
        logoUri: "https://cdn.simpleicons.org/shopify",
        tint: "#6366F1",
      }),
      expect.objectContaining({
        brand: "Bloom & Beam",
        logoUri: "https://cdn.simpleicons.org/nike",
        tint: "#7F1D1D",
      }),
    ]);
  });

  it("home design parity > given selected staging Travel Deals block > then compact card visuals match", () => {
    const travel = webHomePromoSections.find((section) => section.id === "travel");

    expect(travel?.dotCount).toBe(1);
    expect(travel?.cards.slice(0, 6)).toEqual([
      expect.objectContaining({
        brand: "Orbit Airways",
        logoUri: "https://cdn.simpleicons.org/americanairlines",
        tint: "#2563EB",
      }),
      expect.objectContaining({
        brand: "Nova Travel Club",
        logoUri: "https://cdn.simpleicons.org/tripadvisor",
        tint: "#1D4ED8",
      }),
      expect.objectContaining({
        brand: "Horizon Escapes",
        logoUri: "https://cdn.simpleicons.org/meta",
        tint: "#1F3E5F",
      }),
      expect.objectContaining({
        brand: "CloudNine Travel",
        logoUri: "https://cdn.simpleicons.org/tripadvisor",
        tint: "#EAB308",
      }),
      expect.objectContaining({
        brand: "StayMint Hotels",
        logoUri: "https://cdn.simpleicons.org/airbnb",
        tint: "#0EA5E9",
      }),
      expect.objectContaining({
        brand: "Trailhead Outfitters",
        logoUri: "https://cdn.simpleicons.org/tripadvisor",
        tint: "#0F766E",
      }),
    ]);
  });

  it("home design parity > given selected staging Travel Deals rail > then Travel paginates two desktop rows per page", () => {
    const travel = webHomePromoSections.find((section) => section.id === "travel");
    const desktopLayout = getResponsiveHomeLayoutMetrics(1440);
    const travelCards = travel?.cards ?? [];

    expect(travelCards).toHaveLength(16);
    expect(desktopLayout.compactBrandColumns).toBe(7);
    expect(desktopLayout.compactBrandCardsPerPage).toBe(14);
    // 16 cards need two 7x2 desktop pages (14 + 2).
    expect(Math.ceil(travelCards.length / desktopLayout.compactBrandCardsPerPage)).toBe(2);
  });

  it("desktop content cap > given a viewport wider than the content cap > then side padding never squeezes the capped frame below its content width", () => {
    // The content sections render inside a `maxWidth: contentMaxWidth` cap that is
    // centered in the viewport. `contentHorizontalPadding` is applied *inside* that
    // cap, so it must be measured against the cap width — not the raw viewport.
    // Regression: padding computed from the raw viewport grows unbounded past the
    // cap, collapsing brand/banner content to a thin center strip on wide desktops
    // (e.g. 2560px squeezed the 1440 cap down to ~80px of content).
    for (const viewportWidth of [1440, 1512, 1920, 2560, 3440]) {
      const layout = getResponsiveHomeLayoutMetrics(viewportWidth);
      const contentAreaWithinCap =
        layout.contentMaxWidth - layout.contentHorizontalPadding * 2;

      expect(contentAreaWithinCap).toBe(layout.contentWidth);
    }
  });

  it("desktop content cap > given a 2560px viewport > then content stays 1200 wide with symmetric 120px side padding", () => {
    const layout = getResponsiveHomeLayoutMetrics(2560);

    expect(layout.contentWidth).toBe(1200);
    expect(layout.contentHorizontalPadding).toBe(120);
  });

  it("mobile brand sections > given the padded white sheet > then the brand groups overflow and scroll", () => {
    const mobileLayout = getResponsiveHomeLayoutMetrics(389);

    expect(mobileLayout.contentWidth).toBe(357);
    expect(mobileLayout.brandSectionFrameWidth).toBe(309);
    // Both Top Brands (176px) and compact rails (144px) are fixed 8-column x 2-row groups with a
    // fixed 16px gap; each group is far wider than the 309px mobile frame, so it overflows and
    // scrolls with a peek card. The cards never resize.
    expect(mobileLayout.topBrandCardWidth).toBe(176);
    expect(mobileLayout.topBrandGap).toBe(16);
    expect(mobileLayout.compactBrandCardWidth).toBe(144);
    expect(mobileLayout.compactBrandGap).toBe(16);
    expect(mobileLayout.compactBrandColumns).toBe(8);
    expect(mobileLayout.compactBrandGroupWidth).toBe(1264);
    expect(mobileLayout.compactBrandGroupWidth).toBeGreaterThan(mobileLayout.brandSectionFrameWidth);
  });

  it("home design parity > given selected staging Makeup Must Have block > then compact card visuals match", () => {
    const makeup = webHomePromoSections.find((section) => section.id === "makeup");

    expect(makeup?.dotCount).toBe(1);
    expect(makeup?.cards.slice(0, 6)).toEqual([
      expect.objectContaining({
        brand: "Bloom & Beam",
        logoUri: "https://cdn.simpleicons.org/nike",
        tint: "#7F1D1D",
      }),
      expect.objectContaining({
        brand: "Mint Mirror",
        logoUri: "https://cdn.simpleicons.org/target",
        tint: "#0EA5E9",
      }),
      expect.objectContaining({
        brand: "Pure Ritual",
        logoUri: "https://cdn.simpleicons.org/shopee",
        tint: "#0F766E",
      }),
      expect.objectContaining({
        brand: "Luxe Lane Beauty",
        logoUri: "https://cdn.simpleicons.org/shopify",
        tint: "#F97316",
      }),
      expect.objectContaining({
        brand: "Amber Apothecary",
        logoFallbackText: "Amber Apothecary",
        logoUri: "https://cdn.simpleicons.org/target",
        tint: "#7F1D1D",
      }),
      expect.objectContaining({
        brand: "Pearl Polish",
        logoUri: "https://cdn.simpleicons.org/shopee",
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

  it("home design parity > given lower staging home rails > then Expo uses Top Brands L cards (issue #253)", () => {
    const homeFile = readHomeFile();

    // Travel / Beauty / Trending rails match Top Brands: size="L" full-bleed + heart.
    expect(homeFile).toContain("BrandCard");
    expect(homeFile).toContain('size="L"');
    expect(homeFile).not.toContain('size="S"');
    expect(homeFile).toContain("activeIndex={activePromoDot}");
    const brandCardFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/BrandCard.tsx"),
      "utf8"
    );
    expect(brandCardFile).toContain("compactBrandLogoFallback");
    expect(homeFile).toContain("sectionDotCount");
    expect(homeFile).toContain("const sectionDotCount = homeLayout.isDesktop");
    expect(homeFile).toContain("? promoPages.length");
    expect(homeFile).toContain("sectionDotCount > 1 ?");
    expect(homeFile).toContain("count={sectionDotCount}");
    expect(homeFile).not.toContain("offerCard:");
    expect(homeFile).not.toContain("cardCategory:");
  });

  it("home design parity > given selected staging lower promo rail > then Expo pages compact cards horizontally", () => {
    const homeFile = readHomeFile();
    const firstPageCardCount = mobileShellLayout.compactBrandMobileColumns * 2;

    expect(webHomePromoSections.every((section) => section.cards.length > firstPageCardCount)).toBe(
      true
    );
    expect(homeFile).toContain("chunkCompactBrandCards");
    expect(homeFile).toContain("promoPages.map");
    // #498/#499 — promo page size is now section-aware (columns x rows) rather than the
    // flat Top Brands per-page count.
    expect(homeFile).toContain("getPromoSectionRowsPerPage");
    expect(homeFile).toContain("ONE_ROW_PROMO_MAX_CARDS");
    expect(homeFile).toContain("getPromoSectionPageSize");
    expect(homeFile).toContain("Math.max(promoPages.length, dotCount ?? 0)");
    expect(homeFile).toContain("styles.promoScroll");
    expect(homeFile).toContain("styles.promoPage");
    expect(homeFile).toContain("styles.promoPagerContent");
    // Founder feedback 2026-07-11: snap props gate on the desktop pager; mobile
    // free-scrolls a column flow, and few-card sections render a fit-all grid.
    expect(homeFile).toContain("snapToInterval={isPager ? pageWidth : undefined}");
    expect(homeFile).toContain("getPromoSectionLayoutMode(homeLayout.isDesktop, sectionCards.length)");
    expect(homeFile).toContain('layoutMode === "grid"');
    expect(homeFile).toContain("getPromoGridCardWidth(");
    expect(homeFile).toContain("promoColumns.map");
    expect(homeFile).not.toContain("<View style={styles.compactBrandGrid}>");
  });

  it("home design parity > given lower promo rail > then the 8x2 group slides and overflows like Top Brands", () => {
    const homeFile = readHomeFile();

    // The rail scroller fills its section (100%) while each page is a fixed-width group that
    // overflows and scrolls with a peek; no per-page slide animation.
    // #499 — was a verbatim source pin on `homeLayout.topBrandGridHeight`. Rail height is
    // now per-section (travel/makeup are one row), so this asserts the BEHAVIOUR — the
    // scroll view is sized from the section-aware helper — rather than one exact string,
    // which broke on a legitimate change and told us nothing about what the user sees.
    expect(homeFile).toContain("getPromoSectionGridHeight");
    expect(homeFile).toContain("{ height: sectionGridHeight }");
    expect(homeFile).toContain("width: pageWidth,");
    expect(homeFile).not.toContain("getCarouselPageMotionStyle");
  });

  it("home design parity > given lower staging section titles > then long titles can wrap like Next.js", () => {
    const homeFile = readHomeFile();

    expect(homeFile).not.toContain("<Text numberOfLines={1} style={styles.sectionTitleSmall}>");
    expect(homeFile).toMatch(/sectionTitle:\s*\{[\s\S]*?fontSize:\s*18,[\s\S]*?lineHeight:\s*24,/);
    expect(homeFile).toMatch(/sectionTitleSmall:\s*\{[\s\S]*?fontSize:\s*18,[\s\S]*?lineHeight:\s*24,/);
    expect(homeFile).toMatch(/sectionEmoji:\s*\{[\s\S]*?fontSize:\s*18,[\s\S]*?lineHeight:\s*24,/);
    expect(homeFile).toMatch(/topBrandEmoji:\s*\{[\s\S]*?fontSize:\s*18,[\s\S]*?lineHeight:\s*24,/);
    expect(homeFile).toContain("flexShrink: 1");
  });

  it("home section titles > given dark mode > then Top Brands / promo titles match Sign in primary green", () => {
    const homeFile = readHomeFile();
    const signInGraphicFile = readMobileFile("src/components/CustomerSignInNavGraphic.tsx");

    // Sign in pill uses colors.primary (#00CC99). Section titles must share that dark-mode
    // token — not the cyan accent (#5EEAD4) — so Top Brands / promo rails match the header CTA.
    expect(signInGraphicFile).toContain("backgroundColor: colors.primary");
    expect(homeFile).toMatch(
      /sectionTitle:\s*\{[\s\S]*?pickThemed\(colors, "#103522", colors\.primary\)/,
    );
    expect(homeFile).toMatch(
      /sectionTitleSmall:\s*\{[\s\S]*?pickThemed\(colors, "#103522", colors\.primary\)/,
    );
  });

  it("home design parity > given staging mobile icon weight > then Expo avoids heavier placeholder strokes", () => {
    const homeFile = readHomeFile();

    expect(homeFile).toContain("homeIconStrokeWidth");
    expect(homeFile).not.toContain("strokeWidth={2.4}");
    expect(homeFile).not.toContain("strokeWidth={2.6}");
    expect(homeFile).not.toContain("strokeWidth={3}");
  });

  it("mobile/tablet home header greeting > given a signed-in user > then it uses their username with a Hi fallback", () => {
    const homeScreenSource = readHomeFile();

    expect(homeScreenSource).toContain("const mobileTabletGreetingName =");
    expect(homeScreenSource).toContain("session?.username");
    expect(homeScreenSource).toContain("greetingName={mobileTabletGreetingName}");
    expect(homeScreenSource).toContain('greetingName ? `Hi ${greetingName}!` : tc("Hi!")');
  });

  it("home hero banners > given main and side promos render > then they are wrapped as one visual section", () => {
    const homeScreenSource = readHomeFile();
    const heroSectionStyle =
      homeScreenSource.match(/heroBannerSection:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    const heroSectionDesktopStyle =
      homeScreenSource.match(/heroBannerSectionDesktop:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";

    expect(homeScreenSource.indexOf("styles.heroBannerSection")).toBeLessThan(
      homeScreenSource.indexOf("styles.mainHeroFrame"),
    );
    expect(homeScreenSource.indexOf("styles.heroBannerSection")).toBeLessThan(
      homeScreenSource.indexOf("styles.sideHeroRow"),
    );
    expect(heroSectionStyle).toContain("gap: spacing.sm");
    expect(heroSectionStyle).toContain('width: "100%"');
    expect(heroSectionDesktopStyle).toContain('flexDirection: "row"');
    expect(heroSectionDesktopStyle).toContain("gap: spacing.md");
  });

  it("mobile/tablet GoLink header > given the home header renders > then it keeps search only and can cover the GoLink banner", () => {
    const homeScreenSource = readHomeFile();

    expect(homeScreenSource).toContain("const headerActionIconSize = isTabletFrame ? 24 : 20");
    expect(homeScreenSource).toContain("const [mobileTabletGoLinkCovered, setMobileTabletGoLinkCovered] = useState(false)");
    expect(homeScreenSource).toContain("isGoLinkCovered={mobileTabletGoLinkCovered}");
    expect(homeScreenSource).toContain("setMobileTabletGoLinkCovered((covered) => !covered)");
    expect(homeScreenSource).toContain("MobileTabletGoLinkBannerCollapse");
    expect(homeScreenSource).toContain("motion.duration.accordionExpand");
    expect(homeScreenSource).toContain("motion.duration.accordionChevron");
    expect(homeScreenSource).toContain("goLinkToggleChevronRotate");
    expect(homeScreenSource).toContain('"Cover GoLink banner"');
    expect(homeScreenSource).toContain('"Show GoLink banner"');
    expect(homeScreenSource).toContain("<ChevronUpIcon");
    expect(homeScreenSource).not.toContain("<ChevronDownIcon");
    expect(homeScreenSource).toContain("!isTabletFrame ? styles.mobileHeaderIconButtonSmall : null");
    expect(homeScreenSource).toMatch(/mobileHeaderIconButtonSmall:\s*\{[\s\S]*?height:\s*40,[\s\S]*?width:\s*40,/);
    expect(homeScreenSource).toContain('accessibilityLabel={tc("Search")}');
    expect(homeScreenSource).toContain('pathname: "/search"');
    expect(homeScreenSource).toContain("params: { q: normalizedQuery }");
    expect(homeScreenSource).toContain("onOpenSearchPopover={openMobileSearch}");
    expect(homeScreenSource).not.toContain('accessibilityLabel={tc("GoLink")}');
    expect(homeScreenSource).not.toContain("isGoLinkBannerVisible");
    expect(homeScreenSource).not.toContain("setGoLinkBannerVisible");
    expect(homeScreenSource).toContain('variant="mobileTabletHeader"');
    expect(homeScreenSource).toMatch(
      /<MobileTabletGoLinkBannerCollapse[\s\S]*?\/>/,
    );
    expect(homeScreenSource).not.toContain("mobileTabletGoLinkBackdropHidden");
    expect(homeScreenSource).not.toContain('backgroundColor: "rgba(255, 255, 255, 0.96)"');
  });

  it("mobile/tablet GoLink header > given the banner renders in the colored frame > then it fills the frame width", () => {
    const homeScreenSource = readHomeFile();
    const bannerStyle =
      homeScreenSource.match(/mobileTabletGoLinkBanner:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    const toggleButtonStyle =
      homeScreenSource.match(/mobileTabletSheetToggleButton:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";

    expect(bannerStyle).toContain('alignSelf: "stretch"');
    expect(bannerStyle).toContain('maxWidth: "100%"');
    expect(bannerStyle).toContain('width: "100%"');
    expect(bannerStyle).not.toContain("marginRight");
    expect(toggleButtonStyle).toContain("height: 24");
    expect(toggleButtonStyle).toContain("width: 24");
    expect(toggleButtonStyle).toContain("top: -12");
  });

  it("mobile/tablet GoLink sheet toggle > given dark mode > then chevron and pill use themed contrast", () => {
    const homeScreenSource = readHomeRouter(mobileRoot);
    const homeSource = readHomeFile();
    const toggleButtonStyle =
      homeSource.match(/mobileTabletSheetToggleButton:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";

    expect(homeScreenSource).toContain("<ChevronUpIcon color={colors.ink}");
    expect(homeScreenSource).toContain("goLinkToggleChevronRotate");
    expect(homeScreenSource).not.toContain("<ChevronDownIcon");
    expect(homeScreenSource).not.toContain('color="#111827"');
    expect(toggleButtonStyle).toContain("pickThemed(colors, colors.card, colors.borderStrong)");
    expect(toggleButtonStyle).toContain("borderWidth: 1");
    expect(homeSource).toContain('pickThemed(colors, "#303846", "rgba(255, 255, 255, 0.92)")');
  });

  it("mobile/tablet GoLink banner collapse > given covered state > then banner unmounts after compositor animation", () => {
    const collapseSource = fs.readFileSync(
      path.resolve(mobileRoot, "src/screens/home/MobileTabletGoLinkBannerCollapse.tsx"),
      "utf8"
    );

    expect(collapseSource).toContain("isCovered");
    expect(collapseSource).toContain("bannerMounted");
    expect(collapseSource).toContain("scaleY");
    expect(collapseSource).toContain("runTransformTiming");
  });

  it("mobile search screen > given suggestion cards > then it renders the shared compact BrandCard", () => {
    const searchSource = fs.readFileSync(
      path.resolve(mobileRoot, "src/screens/search/SearchSuggestionsGrid.tsx"),
      "utf8"
    );
    const brandCardSource = fs.readFileSync(
      path.resolve(mobileRoot, "src/components/BrandCard.tsx"),
      "utf8"
    );

    expect(searchSource).toContain('import { BrandCard } from "@mobile/components/BrandCard"');
    expect(searchSource).toContain("getScaledCompactBrandCardMetrics");
    expect(searchSource).toContain('size="S"');
    expect(brandCardSource).toContain("onPress={props.onPress}");
  });

  it("mobile search screen > given idle and active states > then it centers content and shows popular fallback", () => {
    const searchScreenSource = fs.readFileSync(
      path.resolve(mobileRoot, "src/screens/CustomerSearchScreen.tsx"),
      "utf8"
    );

    expect(searchScreenSource).toContain("homeLayout.contentMaxWidth");
    expect(searchScreenSource).toContain("homeLayout.contentHorizontalPadding");
    expect(searchScreenSource).toContain('keyboardDismissMode="on-drag"');
    expect(searchScreenSource).toContain("SearchPopularIntro");
    expect(searchScreenSource).toContain("SearchTrendingChips");
    expect(searchScreenSource).toContain("showPopularBelowQuery");
    expect(searchScreenSource).toContain("removeSearchHistoryItem");
    expect(searchScreenSource).toContain("homeLayout.isDesktop");
    expect(searchScreenSource).toContain("setQuery(paramQuery)");
  });

  it("mobile/tablet colored header > given it meets the white content sheet > then the header bottom corners stay square", () => {
    const homeScreenSource = readHomeFile();
    const headerStyle = homeScreenSource.match(/mobileTabletHomeHeader:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    const pageScrollStyle = homeScreenSource.match(/mobileTabletPageScroll:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    const pageScrollContentStyle = homeScreenSource.match(/mobileTabletPageScrollContent:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    const contentScrollStyle = homeScreenSource.match(/mobileTabletContentScroll:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
    const contentSheetStyle = homeScreenSource.match(/mobileTabletContentSheet:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";

    expect(homeScreenSource.indexOf("<MobileTabletHomeHeader")).toBeGreaterThan(
      homeScreenSource.indexOf("style={styles.mobileTabletPageScroll}"),
    );
    expect(homeScreenSource.indexOf("styles.mobileTabletContentScroll")).toBeGreaterThan(
      homeScreenSource.indexOf("<MobileTabletHomeHeader"),
    );
    expect(headerStyle).toContain("borderBottomLeftRadius: 0");
    expect(headerStyle).toContain("borderBottomRightRadius: 0");
    expect(headerStyle).toContain('backgroundColor: "#009D78"');
    expect(headerStyle).not.toContain("height: 550");
    expect(headerStyle).toContain("paddingBottom: 72");
    expect(pageScrollStyle).toContain("flex: 1");
    expect(pageScrollContentStyle).toContain('width: "100%"');
    expect(contentScrollStyle).toContain("backgroundColor: colors.card");
    expect(contentScrollStyle).toContain("borderTopLeftRadius: 34");
    expect(contentScrollStyle).toContain("borderTopRightRadius: 34");
    expect(homeScreenSource).toContain("paddingHorizontal: 24");
    expect(homeScreenSource).toContain("paddingTop: 24");
    expect(homeScreenSource).toContain("homeLayout.topBrandGroupWidth");
    expect(homeScreenSource).not.toContain("styles.mobileTabletSectionFrame");
    expect(contentScrollStyle).not.toContain("marginHorizontal: 40");
    expect(contentScrollStyle).toContain("marginTop: -40");
    expect(contentScrollStyle).toContain('overflow: "visible"');
    expect(contentScrollStyle).toContain('position: "relative"');
    expect(contentScrollStyle).toContain('width: "100%"');
    expect(contentSheetStyle).toContain("borderTopLeftRadius: 34");
    expect(contentSheetStyle).toContain("borderTopRightRadius: 34");
  });

  it("mobile/tablet colored header > given the green reference design > then it uses the teal gradient palette", () => {
    const homeScreenSource = readHomeFile();
    const headerStyle = homeScreenSource.match(/mobileTabletHomeHeader:\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";

    expect(homeScreenSource).toContain("mobileTabletHeaderGradient =");
    expect(homeScreenSource).toContain("linear-gradient(135deg, #006B52 0%, #009D78 48%, #20C7A1 100%)");
    expect(homeScreenSource).toContain("mobileTabletHeaderGradient");
    expect(headerStyle).toContain('backgroundColor: "#009D78"');
  });
});
