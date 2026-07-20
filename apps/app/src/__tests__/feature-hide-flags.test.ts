import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  filterHiddenBottomNavItems,
  filterHiddenProfileMenuItems,
  isGoGoTrackEnabled,
  isGoLinkEnabled,
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

describe("isGoGoTrackEnabled / isGoLinkEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("default-on when unset; hidden only by the literal '0'", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOTOTRACK;
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
    expect(isGoGoTrackEnabled()).toBe(true);
    expect(isGoLinkEnabled()).toBe(true);

    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOTOTRACK", "0");
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOLINK", "0");
    expect(isGoGoTrackEnabled()).toBe(false);
    expect(isGoLinkEnabled()).toBe(false);

    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOTOTRACK", "false");
    expect(isGoGoTrackEnabled()).toBe(true); // only "0" hides
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

  it("drops the GoGoLink (/golink) tab when GOLINK='0'", () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOLINK", "0");
    const hrefs = filterHiddenBottomNavItems(webMobileBottomNavItems).map(
      (i) => i.href,
    );
    expect(hrefs).not.toContain("/golink");
  });

  it("keeps the tab when the flag is default-on", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
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

  it("the GoLink route redirects when the flag is off", () => {
    const s = readMobileFile("app/golink.tsx");
    expect(s).toContain("isGoLinkEnabled");
    expect(s).toContain("Redirect");
  });

  it("the home GoLink hero is gated on isGoLinkEnabled", () => {
    expect(readMobileFile("src/screens/CustomerHomeScreen.tsx")).toContain(
      "isGoLinkEnabled",
    );
  });

  it("the bottom nav filters GoLink through filterHiddenBottomNavItems", () => {
    expect(
      readMobileFile("src/components/CustomerMobileBottomNav.tsx"),
    ).toContain("filterHiddenBottomNavItems");
  });

  it("the web Dockerfile bakes all three ENABLE_* build args", () => {
    const df = readMobileFile("Dockerfile.web.railway");
    for (const arg of [
      "EXPO_PUBLIC_ENABLE_GOGOPASS",
      "EXPO_PUBLIC_ENABLE_GOTOTRACK",
      "EXPO_PUBLIC_ENABLE_GOLINK",
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
