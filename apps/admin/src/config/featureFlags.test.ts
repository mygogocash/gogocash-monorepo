import { afterEach, describe, expect, it, vi } from "vitest";

import {
  filterHiddenAdminItems,
  isCreditScoreEnabled,
  isGoGoPassEnabled,
  resolveCreditScoreEnabled,
  resolveGoGoPassEnabled,
} from "./featureFlags";

// Pre-launch feature-flag gating for the admin panel (2026-07). Contract mirrors
// the customer app's featureFlags.ts EXACTLY: each surface ships ENABLED by
// default and ONLY the literal string "0" hides it, so an unset env can never
// regress an existing build. Flags:
//   NEXT_PUBLIC_ENABLE_CREDIT_SCORE  -> "My Rating Score" / credit-score surface
//   NEXT_PUBLIC_ENABLE_GOGOPASS      -> Membership + Subscription + /gogopass

describe("resolveCreditScoreEnabled", () => {
  it("given unset (undefined) > then enabled (default-on)", () => {
    expect(resolveCreditScoreEnabled(undefined)).toBe(true);
  });

  it('given the literal "0" > then hidden', () => {
    expect(resolveCreditScoreEnabled("0")).toBe(false);
  });

  it('given any non-"0" string ("1", "", "false", "off") > then still enabled', () => {
    expect(resolveCreditScoreEnabled("1")).toBe(true);
    expect(resolveCreditScoreEnabled("")).toBe(true);
    expect(resolveCreditScoreEnabled("false")).toBe(true);
    expect(resolveCreditScoreEnabled("off")).toBe(true);
  });
});

describe("resolveGoGoPassEnabled", () => {
  it("given unset (undefined) > then enabled (default-on)", () => {
    expect(resolveGoGoPassEnabled(undefined)).toBe(true);
  });

  it('given the literal "0" > then hidden', () => {
    expect(resolveGoGoPassEnabled("0")).toBe(false);
  });

  it('given any non-"0" string ("1", "false") > then still enabled', () => {
    expect(resolveGoGoPassEnabled("1")).toBe(true);
    expect(resolveGoGoPassEnabled("false")).toBe(true);
  });
});

describe("isCreditScoreEnabled reads NEXT_PUBLIC_ENABLE_CREDIT_SCORE", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("given the env unset > then returns true (default-on)", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", undefined);
    expect(isCreditScoreEnabled()).toBe(true);
  });

  it('given the env "0" > then returns false', () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", "0");
    expect(isCreditScoreEnabled()).toBe(false);
  });

  it('given the env "1" > then returns true', () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", "1");
    expect(isCreditScoreEnabled()).toBe(true);
  });
});

describe("isGoGoPassEnabled reads NEXT_PUBLIC_ENABLE_GOGOPASS", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("given the env unset > then returns true (default-on)", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", undefined);
    expect(isGoGoPassEnabled()).toBe(true);
  });

  it('given the env "0" > then returns false', () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", "0");
    expect(isGoGoPassEnabled()).toBe(false);
  });

  it('given the env "1" > then returns true', () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", "1");
    expect(isGoGoPassEnabled()).toBe(true);
  });
});

// Mirrors the sidebar (path key) and the tabs (href key) shapes.
const SIDEBAR_SUBITEMS = [
  { name: "GoGoCash Users", path: "/users" },
  { name: "Membership", path: "/membership" },
  { name: "Subscription", path: "/subscription" },
  { name: "Credit score", path: "/credit-score" },
  { name: "Referral", path: "/referral" },
];

const TABS_NAV = [
  { label: "GoGoCash Users", href: "/users" },
  { label: "Membership", href: "/membership" },
  { label: "Subscription", href: "/subscription" },
  { label: "Credit score", href: "/credit-score" },
  { label: "Referral", href: "/referral" },
];

describe("filterHiddenAdminItems (path key — sidebar)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("given both flags default-on > then returns the list unchanged", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", undefined);
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", undefined);
    expect(filterHiddenAdminItems(SIDEBAR_SUBITEMS)).toHaveLength(
      SIDEBAR_SUBITEMS.length,
    );
  });

  it('given CREDIT_SCORE="0" > then only /credit-score is dropped', () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", "0");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", undefined);
    const paths = filterHiddenAdminItems(SIDEBAR_SUBITEMS).map((i) => i.path);
    expect(paths).not.toContain("/credit-score");
    expect(paths).toContain("/membership");
    expect(paths).toContain("/subscription");
    expect(paths).toContain("/users");
    expect(paths).toContain("/referral");
  });

  it('given GOGOPASS="0" > then /membership and /subscription are dropped, /credit-score kept', () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", undefined);
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", "0");
    const paths = filterHiddenAdminItems(SIDEBAR_SUBITEMS).map((i) => i.path);
    expect(paths).not.toContain("/membership");
    expect(paths).not.toContain("/subscription");
    expect(paths).toContain("/credit-score");
    expect(paths).toContain("/users");
  });

  it('given both flags "0" > then all three gated entries are dropped', () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", "0");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", "0");
    const paths = filterHiddenAdminItems(SIDEBAR_SUBITEMS).map((i) => i.path);
    expect(paths).toEqual(["/users", "/referral"]);
  });
});

describe("filterHiddenAdminItems (href key — tabs)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it('given GOGOPASS="0" > then /gogopass and membership/subscription hrefs are dropped', () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", undefined);
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", "0");
    const withGogopass = [...TABS_NAV, { label: "GoGoPass", href: "/gogopass" }];
    const hrefs = filterHiddenAdminItems(withGogopass).map((i) => i.href);
    expect(hrefs).not.toContain("/gogopass");
    expect(hrefs).not.toContain("/membership");
    expect(hrefs).not.toContain("/subscription");
    expect(hrefs).toContain("/credit-score");
  });

  it('given CREDIT_SCORE="0" > then /credit-score href is dropped', () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", "0");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", undefined);
    const hrefs = filterHiddenAdminItems(TABS_NAV).map((i) => i.href);
    expect(hrefs).not.toContain("/credit-score");
    expect(hrefs).toContain("/membership");
  });
});
