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
});
