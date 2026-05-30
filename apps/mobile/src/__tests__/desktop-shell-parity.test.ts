import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { mobileParityRoutes } from "@mobile/navigation/routes";

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

const rootChromeFooterSlotOwners = [
  "src/components/AccountPageShell.tsx",
  "src/components/CustomerRouteState.tsx",
  "src/screens/CustomerCategoryDetailScreen.tsx",
  "src/screens/CustomerDiscoveryScreen.tsx",
  "src/screens/CustomerGoGoSenseScreen.tsx",
  "src/screens/CustomerGoLinkScreen.tsx",
  "src/screens/CustomerMembershipScreen.tsx",
  "src/screens/CustomerMoneyActionScreen.tsx",
  "src/screens/CustomerShopDetailScreen.tsx",
  "src/screens/CustomerSubscriptionScreen.tsx",
];

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
    expect(footerSlot).toContain("mobileShellLayout.desktopBreakpoint");

    for (const routePath of selfChromeRoutes) {
      expect(routeCatalogPaths).toContain(routePath);
      expect(routeChrome).toContain(`"${routePath}"`);
    }

    for (const screenPath of selfChromeScreens) {
      const screenFile = readMobileFile(screenPath);

      expect(screenFile, `${screenPath} desktop navbar`).toContain("CustomerDesktopHeader");
      expect(screenFile, `${screenPath} desktop footer`).toContain("CustomerDesktopFooter");
    }

    for (const screenPath of rootChromeFooterSlotOwners) {
      const screenFile = readMobileFile(screenPath);

      expect(screenFile, `${screenPath} desktop footer slot`).toContain("CustomerDesktopFooterSlot");
    }
  });

  // Regression guard: every directory sub-screen inside CustomerDiscoveryScreen
  // must render the mobile bottom nav at mobile width, matching the sibling
  // CategoryDetail/ShopDetail routes. Previously /brand, /discover, /shops
  // reserved nav clearance (homeLayout.pageBottomPadding) but never rendered the
  // nav, so the bottom nav appeared on /category and /shop/[id] but vanished on
  // the directory routes — inconsistent chrome across sibling routes.
  it("mobile bottom nav > given every Discovery directory sub-screen > then each renders CustomerMobileBottomNav at mobile width", () => {
    const discovery = readMobileFile("src/screens/CustomerDiscoveryScreen.tsx");

    // Slice each function's true body: from its `function Xxx()` definition up to
    // the next top-level `function ` definition (or the styles block).
    function functionBody(name: string): string {
      const defMarker = `function ${name}(`;
      const start = discovery.indexOf(defMarker);
      expect(start, `${defMarker} definition not found`).toBeGreaterThan(-1);
      const after = discovery.indexOf("\nfunction ", start + defMarker.length);
      const stylesAt = discovery.indexOf("\nconst styles = StyleSheet.create(", start);
      const candidates = [after, stylesAt].filter((n) => n > start);
      const end = candidates.length ? Math.min(...candidates) : discovery.length;
      return discovery.slice(start, end);
    }

    for (const name of [
      "BrandDirectoryScreen",
      "ProductDiscoveryScreen",
      "ShopDirectoryScreen",
      "CategoryDirectoryScreen",
    ]) {
      expect(functionBody(name), `${name} should render CustomerMobileBottomNav`).toContain(
        "CustomerMobileBottomNav"
      );
    }
  });
});
