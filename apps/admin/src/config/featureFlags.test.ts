import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isCreditScoreEnabled,
  isGoGoPassEnabled,
  resolveCreditScoreEnabled,
  resolveGoGoPassEnabled,
} from "./featureFlags";

// Pre-launch feature-flag gating for the admin panel. Contract: each surface
// ships ENABLED by default and ONLY the literal string "0" hides it, so an
// unset env can never regress an existing build.
//   NEXT_PUBLIC_ENABLE_CREDIT_SCORE -> "Tier" (credit tier) surface
//   NEXT_PUBLIC_ENABLE_GOGOPASS     -> Membership + Subscription surfaces

describe("resolveCreditScoreEnabled (pure contract)", () => {
  it("given unset (undefined) > then enabled (default-on)", () => {
    expect(resolveCreditScoreEnabled(undefined)).toBe(true);
  });

  it('given the literal "0" > then hidden', () => {
    expect(resolveCreditScoreEnabled("0")).toBe(false);
  });

  it('given any non-"0" string ("1", "", "false") > then still enabled', () => {
    expect(resolveCreditScoreEnabled("1")).toBe(true);
    expect(resolveCreditScoreEnabled("")).toBe(true);
    expect(resolveCreditScoreEnabled("false")).toBe(true);
  });
});

describe("resolveGoGoPassEnabled (pure contract)", () => {
  it("given unset (undefined) > then enabled (default-on)", () => {
    expect(resolveGoGoPassEnabled(undefined)).toBe(true);
  });

  it('given the literal "0" > then hidden', () => {
    expect(resolveGoGoPassEnabled("0")).toBe(false);
  });

  it('given any non-"0" string > then still enabled', () => {
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
});
