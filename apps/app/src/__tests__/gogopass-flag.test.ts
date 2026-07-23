import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  filterGoGoPassMenuItems,
  isGoGoPassEnabled,
  resolveGoGoPassEnabled,
} from "@mobile/config/featureFlags";
import { profileHubMenuItems } from "@mobile/design/webDesignParity";

// GoGoPass rollout flag (2026-07): the Railway beta build must hide the
// customer-facing GoGoPass membership/subscription surfaces without touching
// any other profile. Contract mirrors EXPO_PUBLIC_ENABLE_GOTOTRACK
// (app.config.js): the feature ships ENABLED by default and ONLY the literal
// string "0" hides it — so an unset env can never regress existing builds.

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string): string {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("resolveGoGoPassEnabled", () => {
  it("given unset > then GoGoPass is enabled (default-on)", () => {
    expect(resolveGoGoPassEnabled(undefined)).toBe(true);
  });

  it('given the literal "0" > then GoGoPass is hidden', () => {
    expect(resolveGoGoPassEnabled("0")).toBe(false);
  });

  it('given "1" > then GoGoPass is enabled', () => {
    expect(resolveGoGoPassEnabled("1")).toBe(true);
  });

  it('given any non-"0" string ("", "false", "off") > then GoGoPass stays enabled', () => {
    // ONLY the literal "0" hides — same treatment app.config.js gives
    // EXPO_PUBLIC_ENABLE_GOTOTRACK's single-literal comparison.
    expect(resolveGoGoPassEnabled("")).toBe(true);
    expect(resolveGoGoPassEnabled("false")).toBe(true);
    expect(resolveGoGoPassEnabled("off")).toBe(true);
  });
});

describe("isGoGoPassEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("given EXPO_PUBLIC_ENABLE_GOGOPASS unset > then returns true", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOGOPASS;
    expect(isGoGoPassEnabled()).toBe(true);
  });

  it('given EXPO_PUBLIC_ENABLE_GOGOPASS="0" > then returns false', () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOGOPASS", "0");
    expect(isGoGoPassEnabled()).toBe(false);
  });
});

describe("filterGoGoPassMenuItems", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("given the flag unset > then the menu is returned unchanged (GoGoPass row included)", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOGOPASS;
    const labels = filterGoGoPassMenuItems(profileHubMenuItems).map((item) => item.label);
    expect(labels).toEqual(profileHubMenuItems.map((item) => item.label));
    expect(labels).toContain("GoGoPass");
  });

  it('given the flag "0" > then only the /membership (GoGoPass) row is dropped, order preserved', () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOGOPASS", "0");
    const filtered = filterGoGoPassMenuItems(profileHubMenuItems);
    expect(filtered.map((item) => item.label)).toEqual(
      profileHubMenuItems.filter((item) => item.href !== "/membership").map((item) => item.label)
    );
    expect(filtered.some((item) => item.label === "GoGoPass")).toBe(false);
    // Neighbours survive — the filter must not over-match.
    expect(filtered.some((item) => item.label === "GoGoTrack")).toBe(true);
    expect(filtered.some((item) => item.label === "Missing Orders")).toBe(true);
  });
});

describe("GoGoPass hidden surfaces (wiring)", () => {
  it("profile menu + hub + desktop rail > given the flag > then rows render through filterGoGoPassMenuItems", () => {
    // All three consumers of profileHubMenuItems must share the ONE filter so a
    // surface can't be missed when the flag flips.
    expect(readMobileFile("src/components/CustomerProfileMenu.tsx")).toContain(
      "filterHiddenProfileMenuItems(profileHubMenuItems)"
    );
    expect(readMobileFile("src/screens/CustomerProfileScreen.tsx")).toContain(
      "filterHiddenProfileMenuItems(profileHubMenuItems)"
    );
    expect(readMobileFile("src/components/AccountPageShell.tsx")).toContain(
      "filterHiddenProfileMenuItems(profileHubMenuItems)"
    );
  });

  it("membership + subscription screens > given the flag off > then they redirect to /profile", () => {
    // CustomerSubscriptionScreen serves /subscription, /billing AND /pricing, so
    // one guard covers all three routes; CustomerMembershipScreen covers /membership.
    for (const screenPath of [
      "src/screens/CustomerMembershipScreen.tsx",
      "src/screens/CustomerSubscriptionScreen.tsx",
    ]) {
      const source = readMobileFile(screenPath);
      expect(source).toContain("isGoGoPassEnabled");
      expect(source).toContain('<Redirect href="/profile" />');
    }
  });

  it("tier ring / badge / mark > given the flag off > then the shared components degrade to the plain variants", () => {
    // Central gating: EVERY consumer (ProfileHeroCard, CustomerProfileBar,
    // AccountWalletHeroCard, the popover hero) inherits the plain avatar/no badge
    // without per-call-site plumbing.
    expect(readMobileFile("src/components/GoGoPassAvatar.tsx")).toContain("isGoGoPassEnabled()");
    expect(readMobileFile("src/components/GoGoPassBadge.tsx")).toContain("isGoGoPassEnabled()");
    expect(readMobileFile("src/components/GoGoPassMark.tsx")).toContain("isGoGoPassEnabled()");
  });

  it("account settings > given the flag off > then the Stripe subscription card is gated", () => {
    expect(readMobileFile("src/screens/CustomerAccountSettingsScreen.tsx")).toContain(
      "isGoGoPassEnabled"
    );
  });

  it('eas.json > given the beta rollout > then ONLY the beta profile pins the flag to "0"', () => {
    const easJson = JSON.parse(readMobileFile("eas.json")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    expect(easJson.build.beta.env?.EXPO_PUBLIC_ENABLE_GOGOPASS).toBe("0");
    for (const profile of ["development", "preview", "closedtest", "production"]) {
      expect(easJson.build[profile].env?.EXPO_PUBLIC_ENABLE_GOGOPASS).toBeUndefined();
    }
  });

  it("env example > given the new env var > then .env.example declares it", () => {
    expect(readMobileFile(".env.example")).toContain("EXPO_PUBLIC_ENABLE_GOGOPASS");
  });
});
