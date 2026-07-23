import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { mobileParityRoutes } from "@mobile/navigation/routes";
import { readDiscoverySources } from "../test-support/discoverySource";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

const selfChromeRoutes = [
  "/",
  "/login",
  "/register",
  "/account-setup",
  "/privacy-policy",
  "/link-mycashback",
  "/link-mycashback/my-cashback-sign-in",
];

const selfChromeScreens = [
  "src/screens/CustomerAuthScreen.tsx",
  "src/screens/CustomerAccountSetupScreen.tsx",
  "src/screens/CustomerPrivacyPolicyScreen.tsx",
  "src/screens/CustomerLinkCashbackScreen.tsx",
  "src/screens/CustomerMyCashbackSignInScreen.tsx",
  "src/screens/CustomerHomeScreen.tsx",
];

// Screens that render the desktop footer slot directly (i.e. not via AccountPageShell).
// CustomerMembershipScreen now renders inside AccountPageShell, so it inherits the
// footer from the shell and is intentionally not listed here.
const rootChromeFooterSlotOwners = [
  "src/components/CustomerRouteState.tsx",
  "src/screens/CustomerCategoryDetailScreen.tsx",
  "src/screens/CustomerDiscoveryScreen.tsx",
  "src/screens/CustomerGoLinkScreen.tsx",
  "src/screens/CustomerMoneyActionScreen.tsx",
  "src/screens/CustomerShopDetailScreen.tsx",
  "src/screens/CustomerSubscriptionScreen.tsx",
];

const cappedDesktopFooterScreens = [
  "src/components/AccountPageShell.tsx",
  "src/screens/CustomerHomeScreen.tsx",
  "src/screens/CustomerCategoryDetailScreen.tsx",
  "src/screens/CustomerShopDetailScreen.tsx",
];

function readDiscoveryChromeSources() {
  return readDiscoverySources(mobileRoot);
}

describe("desktop route shell parity", () => {
  it("desktop route chrome > given every migrated customer route > then Expo guarantees a navbar and footer on desktop", () => {
    const rootLayout = readMobileFile("app/_layout.tsx");
    const routeChrome = readMobileFile("src/components/CustomerDesktopRouteChrome.tsx");
    const footerSlot = readMobileFile("src/components/CustomerDesktopFooterSlot.tsx");
    const routeCatalogPaths = mobileParityRoutes.map((route) => route.nativePath);

    expect(rootLayout).toContain("CustomerDesktopRouteChrome");
    expect(routeChrome).toContain("CustomerDesktopHeader");
    expect(routeChrome).toContain("mobileShellLayout.desktopBreakpoint");
    expect(routeChrome).toContain("usePathname");
    expect(routeChrome).toContain("{children}");
    expect(routeChrome).toContain("isDesktopSelfChromePathname(pathname)");
    expect(footerSlot).toContain("CustomerDesktopFooter");
    expect(footerSlot).toContain("getDesktopFooterHorizontalPadding");
    expect(footerSlot).toContain("mobileShellLayout.desktopBreakpoint");

    for (const routePath of selfChromeRoutes) {
      expect(routeCatalogPaths).toContain(routePath);
      expect(routeChrome).toContain(`"${routePath}"`);
    }

    for (const screenPath of selfChromeScreens) {
      const screenFile = readMobileFile(screenPath);

      expect(screenFile, `${screenPath} desktop navbar`).toContain("CustomerDesktopHeader");
      expect(screenFile, `${screenPath} desktop footer`).toMatch(
        /CustomerDesktopFooter|CustomerDesktopFooterSlot/,
      );
    }

    for (const screenPath of rootChromeFooterSlotOwners) {
      const screenFile =
        screenPath === "src/screens/CustomerDiscoveryScreen.tsx"
          ? readDiscoveryChromeSources()
          : readMobileFile(screenPath);

      expect(screenFile, `${screenPath} desktop footer slot`).toContain("CustomerDesktopFooterSlot");
    }
  });

  it("account shell footer offset > given desktop profile/quest pages > then it uses the homepage full-bleed footer path", () => {
    const shell = readMobileFile("src/components/AccountPageShell.tsx");

    expect(shell, "shell should distinguish rail vs quest desktop layouts").toContain(
      "const useDesktopHomepageFooter = isDesktop && !showDesktopRail"
    );
    expect(shell, "shell should full-bleed desktop chrome for rail and quest pages").toContain(
      "const useDesktopFullBleedChrome = isDesktop && (useDesktopHomepageFooter || showDesktopRail)"
    );
    expect(shell, "shell should cap rail content inside a centered column").toContain(
      "styles.desktopContentCap"
    );
    expect(shell, "shell should use the same desktop footer offset as the homepage").toContain(
      "getDesktopShellOffset(width)"
    );
    expect(shell, "shell should render CustomerDesktopFooter on desktop").toContain(
      "<CustomerDesktopFooter"
    );
    expect(shell, "shell should pass the homepage shell offset to the footer").toContain(
      "horizontalPadding={desktopFooterHorizontalOffset}"
    );
    expect(shell, "shell should not use the legacy padded footer slot on desktop").not.toContain(
      "CustomerDesktopFooterSlot"
    );
  });

  it("desktop capped footer width > given content-capped pages > then the footer offsets back to the viewport edge", () => {
    for (const screenPath of cappedDesktopFooterScreens) {
      const screenFile = readMobileFile(screenPath);

      expect(screenFile, `${screenPath} should compute centered shell offset`).toContain(
        "getDesktopShellOffset"
      );
      expect(screenFile, `${screenPath} should pass shell offset to footer`).toContain(
        "horizontalPadding={desktopFooterHorizontalOffset}"
      );
      expect(screenFile, `${screenPath} should not leave capped footer at parent x`).not.toContain(
        "CustomerDesktopFooter horizontalPadding={0} viewportWidth={width}"
      );
    }

    const discoveryScreens = readDiscoveryChromeSources();
    expect(discoveryScreens, "discovery screens should compute centered shell offset").toContain(
      "getDesktopShellOffset"
    );
    expect(discoveryScreens, "discovery screens should pass shell offset to footer").toContain(
      "horizontalPadding={desktopFooterHorizontalOffset}"
    );
    expect(discoveryScreens, "discovery screens should not leave capped footer at parent x").not.toContain(
      "CustomerDesktopFooter horizontalPadding={0} viewportWidth={width}"
    );
  });

  // Regression guard: every directory sub-screen inside CustomerDiscoveryScreen
  // must render the mobile bottom nav at mobile width, matching the sibling
  // CategoryDetail/ShopDetail routes. Previously /brand, /discover, /shops
  // reserved nav clearance (homeLayout.pageBottomPadding) but never rendered the
  // nav, so the bottom nav appeared on /category and /shop/[id] but vanished on
  // the directory routes — inconsistent chrome across sibling routes.
  it("mobile bottom nav > given every Discovery directory sub-screen > then each renders CustomerMobileBottomNav at mobile width", () => {
    const discovery = readDiscoveryChromeSources();

    function functionBody(name: string): string {
      const defMarker = `function ${name}(`;
      const start = discovery.indexOf(defMarker);
      expect(start, `${defMarker} definition not found`).toBeGreaterThan(-1);
      const after = discovery.indexOf("\nfunction ", start + defMarker.length);
      const exportAfter = discovery.indexOf("\nexport function ", start + defMarker.length);
      const candidates = [after, exportAfter].filter((n) => n > start);
      const end = candidates.length ? Math.min(...candidates) : discovery.length;
      return discovery.slice(start, end);
    }

    for (const name of [
      "CustomerBrandDirectoryScreen",
      "CustomerProductDiscoveryScreen",
      "CustomerShopDirectoryScreen",
      "CustomerCategoryDirectoryScreen",
    ]) {
      expect(functionBody(name), `${name} should render CustomerMobileBottomNav`).toContain(
        "CustomerMobileBottomNav"
      );
    }
  });

  it("desktop footer trailing gap > given footer inside page scroll > then must not force minHeight fill or extra bottom clearance", () => {
    const shell = readMobileFile("src/components/AccountPageShell.tsx");
    const parity = readMobileFile("src/design/webDesignParity.ts");
    const privacy = readMobileFile("src/screens/CustomerPrivacyPolicyScreen.tsx");

    expect(shell).toContain("pageMinFill");
    expect(shell).toContain("isDesktop ? null : styles.pageMinFill");
    expect(shell).not.toContain("mobileShellLayout.desktopBottomClearance");
    expect(privacy).toContain("publicLegalPageMinFill");
    expect(privacy).toContain("isDesktop ? null : styles.publicLegalPageMinFill");
    expect(privacy).not.toContain("desktopBottomClearance + 120");
    expect(parity).toMatch(/pageBottomPadding: isDesktop\s*\?\s*0/);

    const routeState = readMobileFile("src/components/CustomerRouteState.tsx");
    expect(routeState).toContain("desktopFooterPinned");
    expect(routeState).toContain('marginTop: "auto"');
    expect(routeState).toContain("phoneFrameDesktop");
  });

  it("desktop subnav underline > given an inactive category tab > then Expo always renders the underline and fades it in on hover, matching web SubHeader", () => {
    const header = readMobileFile("src/components/CustomerDesktopHeader.tsx");

    // Web SubHeader renders the underline for every tab and toggles opacity
    // (active = 1, inactive hover = 0.4 via group-hover:opacity-40). The old Expo
    // conditional-mount must be gone.
    expect(header).toContain("DesktopCategoryTab");
    expect(header).toContain("onHoverIn={() => setHovered(true)}");
    expect(header).toContain("onHoverOut={() => setHovered(false)}");
    expect(header).toContain("const webSubNavHoverUnderlineOpacity = 0.4;");
    expect(header).not.toContain(
      "item.active ? <View style={styles.desktopCategoryUnderline} /> : null"
    );
  });

  it("desktop header search > given the shared navbar search field > then it has a stable web id for accessibility tooling", () => {
    const search = readMobileFile("src/components/DesktopHeaderSearch.tsx");

    expect(search).toContain('nativeID="desktop-header-search-input"');
  });

  it("desktop header search > given premium search plan > then it navigates to /search with field styling", () => {
    const search = readMobileFile("src/components/DesktopHeaderSearch.tsx");

    expect(search).toContain('pathname: "/search"');
    expect(search).toContain("normalizeSearchQuery");
    expect(search).toContain("returnKeyType=\"search\"");
    expect(search).toContain("shadows.cardCss");
    expect(search).toContain("colors.field");
    expect(search).toContain("shellFocused");
  });

  it("desktop header search > given web focus expand > then default maxWidth 560 expands to 640 on web", () => {
    const search = readMobileFile("src/components/DesktopHeaderSearch.tsx");

    expect(search).toContain("maxWidth: 560");
    expect(search).toContain("shellExpanded");
    expect(search).toContain("maxWidth: 640");
    expect(search).toContain('Platform.OS === "web"');
  });

  it("desktop header search > given premium keyboard shortcut > then Meta/Ctrl+K focuses input and tracks search_open", () => {
    const search = readMobileFile("src/components/DesktopHeaderSearch.tsx");

    expect(search).toContain('Platform.OS !== "web"');
    expect(search).toContain("keydown");
    expect(search).toContain("metaKey");
    expect(search).toContain("ctrlKey");
    expect(search).toContain('event.key.toLowerCase() === "k"');
    expect(search).toContain("preventDefault");
    expect(search).toContain("trackSearchOpen");
    expect(search).toContain('"keyboard_shortcut"');
    expect(search).toContain("trackSearchSubmit");
    expect(search).toContain('"desktop_header"');
    expect(search).toContain("recordSearchQuery");
    expect(search).toContain("useAnalytics");
  });

  it("desktop header search > given shellFocused dark mode > then focus shadow uses pickThemed", () => {
    const search = readMobileFile("src/components/DesktopHeaderSearch.tsx");

    expect(search).toMatch(
      /shellFocused:[\s\S]*?backgroundColor:\s*pickThemed\([\s\S]*?boxShadow:\s*pickThemed\(/,
    );
    expect(search).toContain("rgba(0, 0, 0, 0.35)");
  });

  it("home search popover > given empty query > then it shows recent searches via SearchRecentChips", () => {
    const popover = readMobileFile("src/screens/home/HomeSearchPopularPopover.tsx");
    const home = readMobileFile("src/screens/CustomerHomeScreen.tsx");

    expect(popover).toContain("SearchRecentChips");
    expect(popover).toContain("readSearchHistory");
    expect(popover).toContain("onSelectRecent");
    expect(popover).toContain("clearSearchHistory");
    expect(popover).toContain("removeSearchHistoryItem");
    expect(home).toContain("onSelectRecent={(term) => setSearchQuery(term)}");
  });

  it("desktop home header search > given the home desktop shell > then it opens the popular search popover", () => {
    const home = readMobileFile("src/screens/CustomerHomeScreen.tsx");

    expect(home).toContain("onSearchFocus={openSearchPopover}");
    expect(home).toContain("searchQuery={searchQuery}");
  });

  it("desktop header search > given every desktop route > then the global header search is never hidden (seam kept; always shown per founder request 2026-07-22, overriding #436/#463/#495)", () => {
    const chrome = readMobileFile("src/components/CustomerDesktopRouteChrome.tsx");
    const header = readMobileFile("src/components/CustomerDesktopHeader.tsx");

    // Wiring seam preserved so per-route hiding can be reintroduced if ever needed.
    expect(chrome).toContain("shouldHideDesktopHeaderSearch");
    expect(chrome).toContain("hideSearch={shouldHideDesktopHeaderSearch(pathname)}");
    expect(header).toContain("hideSearch");
    expect(header).toContain("hideSearch ? null : (");
    // ...but the function no longer hides ANY route. The former directory-route
    // literals are gone; the always-false behavior is pinned in
    // desktop-header-search-routes.render.test.tsx.
    expect(chrome).not.toContain('normalizedPathname === "/brand"');
    expect(chrome).not.toContain('normalizedPathname.startsWith("/category/")');
    expect(chrome).not.toContain('normalizedPathname === "/shops"');
    expect(chrome).not.toContain('normalizedPathname === "/discover"');
  });

  it("desktop brand logo > given navbar and footer brand links > then both use the shared navbar logo treatment", () => {
    const header = readMobileFile("src/components/CustomerDesktopHeader.tsx");
    const footer = readMobileFile("src/components/CustomerDesktopFooter.tsx");
    const brandLink = readMobileFile("src/components/CustomerDesktopBrandLink.tsx");

    expect(header).toContain("CustomerDesktopBrandLink");
    expect(footer).toContain("CustomerDesktopBrandLink");
    expect(footer).not.toContain("styles.logoLink");
    expect(footer).not.toContain("styles.logoMark");
    expect(footer.match(/footerBrand: \{[\s\S]*?\n  \}/)?.[0]).toContain(
      'alignItems: "flex-start"'
    );
    expect(brandLink).toContain("hoverLift={false}");
    expect(brandLink).toContain("onPointerEnter={() => setLogoHovered(true)}");
    expect(brandLink).toContain("onPointerLeave={() => setLogoHovered(false)}");
    expect(brandLink).toContain(
      "getInteractionTransformStyle({ hovered: logoHovered, hoverLift: true })"
    );
    expect(brandLink).toContain('boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)"');
  });

});
