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
  "src/components/AccountPageShell.tsx",
  "src/components/CustomerRouteState.tsx",
  "src/screens/CustomerCategoryDetailScreen.tsx",
  "src/screens/CustomerDiscoveryScreen.tsx",
  "src/screens/CustomerGoGoTrackScreen.tsx",
  "src/screens/CustomerGoLinkScreen.tsx",
  "src/screens/CustomerMoneyActionScreen.tsx",
  "src/screens/CustomerShopDetailScreen.tsx",
  "src/screens/CustomerSubscriptionScreen.tsx",
];

const cappedDesktopFooterScreens = [
  "src/screens/CustomerHomeScreen.tsx",
  "src/screens/CustomerCategoryDetailScreen.tsx",
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

  it("account shell footer offset > given the capped + padded shell frame > then it passes a computed offset to the footer slot", () => {
    const shell = readMobileFile("src/components/AccountPageShell.tsx");

    expect(shell, "shell should put non-rail desktop pages on the homepage footer path").toContain(
      "const useDesktopHomepageFooter = isDesktop && !showDesktopRail"
    );
    expect(shell, "shell should compute the footer offset from frame metrics").toContain(
      "getAccountShellFooterHorizontalPadding"
    );
    expect(shell, "shell should pass rail alignment to the footer offset helper").toContain(
      "alignToNavbarShell: showDesktopRail"
    );
    expect(shell, "shell should use the same desktop footer offset as the homepage").toContain(
      "getDesktopShellOffset(width)"
    );
    expect(shell, "shell should render the homepage footer element for desktop non-rail pages").toContain(
      "<CustomerDesktopFooter"
    );
    expect(shell, "shell should pass the computed offset to the footer slot").toContain(
      "horizontalPadding={footerHorizontalPadding}"
    );
    expect(shell, "shell should not leave the footer slot at the default zero offset").not.toMatch(
      /<CustomerDesktopFooterSlot\s+style=\{styles\.desktopFooter\}\s*\/>/
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
    expect(search).toContain("max-width");
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
