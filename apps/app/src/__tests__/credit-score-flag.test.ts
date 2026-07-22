import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  filterHiddenProfileMenuItems,
  isCreditScoreEnabled,
  resolveCreditScoreEnabled,
} from "@mobile/config/featureFlags";
import { profileHubSubNavItems } from "@mobile/design/webDesignParity";

// "My Rating Score" (credit-score) rollout flag (2026-07): the Railway beta
// build must hide the customer-facing credit-score surface without touching any
// other profile row. Contract mirrors EXPO_PUBLIC_ENABLE_GOGOPASS /
// EXPO_PUBLIC_ENABLE_GOTOTRACK: the feature ships ENABLED by default and ONLY
// the literal string "0" hides it, so an unset env can never regress a build.

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const readMobileFile = (p: string) =>
  fs.readFileSync(path.join(mobileRoot, p), "utf8");

describe("resolveCreditScoreEnabled", () => {
  it("given unset > then credit score is enabled (default-on)", () => {
    expect(resolveCreditScoreEnabled(undefined)).toBe(true);
  });

  it('given the literal "0" > then credit score is hidden', () => {
    expect(resolveCreditScoreEnabled("0")).toBe(false);
  });

  it('given any non-"0" string ("1", "", "false", "off") > then it stays enabled', () => {
    expect(resolveCreditScoreEnabled("1")).toBe(true);
    expect(resolveCreditScoreEnabled("")).toBe(true);
    expect(resolveCreditScoreEnabled("false")).toBe(true);
    expect(resolveCreditScoreEnabled("off")).toBe(true);
  });
});

describe("isCreditScoreEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("given EXPO_PUBLIC_ENABLE_CREDIT_SCORE unset > then returns true", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_CREDIT_SCORE;
    expect(isCreditScoreEnabled()).toBe(true);
  });

  it('given EXPO_PUBLIC_ENABLE_CREDIT_SCORE="0" > then returns false', () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_CREDIT_SCORE", "0");
    expect(isCreditScoreEnabled()).toBe(false);
  });
});

describe("filterHiddenProfileMenuItems drops the Profile-accordion 'My Rating Score' sub-item", () => {
  afterEach(() => vi.unstubAllEnvs());

  it('given CREDIT_SCORE="0" > then "My Rating Score" (/credit-score) is dropped, neighbours kept', () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_CREDIT_SCORE", "0");
    const items = filterHiddenProfileMenuItems(profileHubSubNavItems);
    const hrefs = items.map((i) => i.href);
    expect(hrefs).not.toContain("/credit-score");
    expect(hrefs).toContain("/profile/info");
    expect(hrefs).toContain("/method");
  });

  it("given the flag default-on > then the sub-nav is returned unchanged", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_CREDIT_SCORE;
    expect(filterHiddenProfileMenuItems(profileHubSubNavItems).length).toBe(
      profileHubSubNavItems.length,
    );
  });
});

describe("credit-score hide wiring across surfaces (source-pinned)", () => {
  it("the credit-score screen redirects when the flag is off", () => {
    const s = readMobileFile("src/screens/CustomerCreditScoreScreen.tsx");
    expect(s).toContain("isCreditScoreEnabled");
    expect(s).toContain("Redirect");
  });

  it("the /profile/my-rating alias redirects to /profile when the flag is off", () => {
    const s = readMobileFile("app/profile/my-rating.tsx");
    expect(s).toContain("isCreditScoreEnabled");
  });

  it("both Profile-accordion consumers filter profileHubSubNavItems", () => {
    for (const f of [
      "src/screens/CustomerProfileScreen.tsx",
      "src/components/AccountPageShell.tsx",
    ]) {
      const src = readMobileFile(f);
      expect(src).toMatch(
        /filterHiddenProfileMenuItems\(\s*profileHubSubNavItems/,
      );
    }
  });

  it("the web Dockerfile bakes the EXPO_PUBLIC_ENABLE_CREDIT_SCORE build arg", () => {
    expect(readMobileFile("Dockerfile.web.railway")).toContain(
      "ARG EXPO_PUBLIC_ENABLE_CREDIT_SCORE",
    );
  });

  it('eas.json beta profile pins credit score to "0"', () => {
    const eas = JSON.parse(readMobileFile("eas.json")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    expect(eas.build.beta.env?.EXPO_PUBLIC_ENABLE_CREDIT_SCORE).toBe("0");
  });
});
