import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  filterHiddenBottomNavItems,
  filterHiddenProfileMenuItems,
  isGoGoTrackEnabled,
  isGoLinkEnabled,
  resolveGoLinkMode,
} from "@mobile/config/featureFlags";
import {
  profileHubMenuItems,
  webMobileBottomNavItems,
} from "@mobile/design/webDesignParity";

// GoGoTrack + GoLink hide flags (2026-07): same "only the literal '0' disables"
// contract as GoGoPass, so an unset env can never regress existing builds. The
// beta build hides all three customer features across every surface.

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const readMobileFile = (p: string) =>
  fs.readFileSync(path.join(mobileRoot, p), "utf8");

describe("isGoGoTrackEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("default-on when unset; hidden only by the literal '0'", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOTOTRACK;
    expect(isGoGoTrackEnabled()).toBe(true);

    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOTOTRACK", "0");
    expect(isGoGoTrackEnabled()).toBe(false);

    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOTOTRACK", "false");
    expect(isGoGoTrackEnabled()).toBe(true); // only "0" hides
  });
});

describe("isGoLinkEnabled (3-state coming-soon rollout)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to comingSoon (NOT enabled) so beta flips with no env change", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
    delete process.env.EXPO_PUBLIC_GOLINK_COMING_SOON;
    expect(resolveGoLinkMode()).toBe("comingSoon");
    // isGoLinkEnabled() now means the mode is FULLY clickable — false while coming-soon.
    expect(isGoLinkEnabled()).toBe(false);
  });

  it('EXPO_PUBLIC_GOLINK_COMING_SOON="0" fully launches GoLink (enabled)', () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
    vi.stubEnv("EXPO_PUBLIC_GOLINK_COMING_SOON", "0");
    expect(resolveGoLinkMode()).toBe("enabled");
    expect(isGoLinkEnabled()).toBe(true);
  });

  it('EXPO_PUBLIC_ENABLE_GOLINK="0" hides GoLink entirely (wins over coming-soon)', () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOLINK", "0");
    expect(resolveGoLinkMode()).toBe("hidden");
    expect(isGoLinkEnabled()).toBe(false);
  });
});

describe("filterHiddenProfileMenuItems", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("drops the GoGoTrack (/gototrack) row when GOTOTRACK='0', keeps neighbours", () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOTOTRACK", "0");
    const labels = filterHiddenProfileMenuItems(profileHubMenuItems).map(
      (i) => i.label,
    );
    expect(labels).not.toContain("GoGoTrack");
    expect(labels).toContain("My Wallet");
  });

  it("drops the GoGoPass (/membership) row when GOGOPASS='0'", () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOGOPASS", "0");
    const labels = filterHiddenProfileMenuItems(profileHubMenuItems).map(
      (i) => i.label,
    );
    expect(labels).not.toContain("GoGoPass");
  });

  it("drops BOTH rows when both flags are '0'", () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOGOPASS", "0");
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOTOTRACK", "0");
    const hrefs = filterHiddenProfileMenuItems(profileHubMenuItems).map(
      (i) => i.href,
    );
    expect(hrefs).not.toContain("/membership");
    expect(hrefs).not.toContain("/gototrack");
  });

  it("returns everything unchanged when all flags default-on", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOGOPASS;
    delete process.env.EXPO_PUBLIC_ENABLE_GOTOTRACK;
    expect(filterHiddenProfileMenuItems(profileHubMenuItems).length).toBe(
      profileHubMenuItems.length,
    );
  });
});

describe("filterHiddenBottomNavItems (GoLink)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("drops the GoGoLink (/golink) tab ONLY in hidden mode (GOLINK='0')", () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOLINK", "0");
    const hrefs = filterHiddenBottomNavItems(webMobileBottomNavItems).map(
      (i) => i.href,
    );
    expect(hrefs).not.toContain("/golink");
  });

  it("KEEPS the tab in coming-soon mode (default) — it is disabled, not removed", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
    delete process.env.EXPO_PUBLIC_GOLINK_COMING_SOON;
    const hrefs = filterHiddenBottomNavItems(webMobileBottomNavItems).map(
      (i) => i.href,
    );
    expect(hrefs).toContain("/golink");
  });

  it("keeps the tab when fully enabled", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
    vi.stubEnv("EXPO_PUBLIC_GOLINK_COMING_SOON", "0");
    const hrefs = filterHiddenBottomNavItems(webMobileBottomNavItems).map(
      (i) => i.href,
    );
    expect(hrefs).toContain("/golink");
  });
});

describe("hide wiring across surfaces (source-pinned)", () => {
  it("all three profile menu consumers route through filterHiddenProfileMenuItems", () => {
    for (const f of [
      "src/components/AccountPageShell.tsx",
      "src/components/CustomerProfileMenu.tsx",
      "src/screens/CustomerProfileScreen.tsx",
    ]) {
      expect(readMobileFile(f)).toContain("filterHiddenProfileMenuItems");
    }
  });

  it("the GoGoTrack screen redirects when the flag is off", () => {
    const s = readMobileFile("src/screens/CustomerGoGoTrackScreen.tsx");
    expect(s).toContain("isGoGoTrackEnabled");
    expect(s).toContain("Redirect");
  });

  it("the GoLink route redirects unless FULLY enabled (hidden AND coming-soon bounce home)", () => {
    const s = readMobileFile("app/golink.tsx");
    // isGoLinkEnabled() === (mode === "enabled"), so !isGoLinkEnabled() covers
    // both hidden and coming-soon — a direct URL never reaches the live flow.
    expect(s).toContain("isGoLinkEnabled");
    expect(s).toContain("Redirect");
  });

  it("the home GoLink hero is gated on the 3-state resolveGoLinkMode", () => {
    expect(readMobileFile("src/screens/CustomerHomeScreen.tsx")).toContain(
      "resolveGoLinkMode",
    );
  });

  it("both bottom-nav components route GoLink through the shared coming-soon helper", () => {
    for (const f of [
      "src/components/CustomerMobileBottomNav.tsx",
      "src/screens/home/CustomerMobileBottomNav.tsx",
    ]) {
      const s = readMobileFile(f);
      expect(s).toContain("filterHiddenBottomNavItems");
      expect(s).toContain("isGoLinkComingSoonTab");
    }
  });

  it("the mobile/tablet home header renders the GoLink box unless hidden, flagged coming-soon", () => {
    const s = readMobileFile("src/screens/home/MobileTabletHomeHeader.tsx");
    expect(s).toContain("resolveGoLinkMode");
    expect(s).toContain("comingSoon");
  });

  it("the web Dockerfile bakes all feature build args incl. the coming-soon flag", () => {
    const df = readMobileFile("Dockerfile.web.railway");
    for (const arg of [
      "EXPO_PUBLIC_ENABLE_GOGOPASS",
      "EXPO_PUBLIC_ENABLE_GOTOTRACK",
      "EXPO_PUBLIC_ENABLE_GOLINK",
      "EXPO_PUBLIC_GOLINK_COMING_SOON",
    ]) {
      expect(df).toContain(`ARG ${arg}`);
    }
  });

  it("eas.json beta profile pins all three flags to '0'", () => {
    const eas = JSON.parse(readMobileFile("eas.json")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    expect(eas.build.beta.env?.EXPO_PUBLIC_ENABLE_GOGOPASS).toBe("0");
    expect(eas.build.beta.env?.EXPO_PUBLIC_ENABLE_GOTOTRACK).toBe("0");
    expect(eas.build.beta.env?.EXPO_PUBLIC_ENABLE_GOLINK).toBe("0");
  });
});
