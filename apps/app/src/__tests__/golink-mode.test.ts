import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isGoLinkComingSoon,
  isGoLinkEnabled,
  resolveGoLinkMode,
} from "@mobile/config/featureFlags";

// GoLink 3-state rollout (2026-07): the founder decision ships GoLink VISIBLE but
// NON-CLICKABLE ("coming soon") on mobile. Two env vars compose the mode:
//   EXPO_PUBLIC_ENABLE_GOLINK === "0"  -> "hidden"     (wins over everything)
//   EXPO_PUBLIC_GOLINK_COMING_SOON     -> "comingSoon" by DEFAULT; only "0" opts out
//   otherwise                          -> "enabled"    (fully clickable / live flow)
// Coming-soon DEFAULTS ON so beta flips with NO env change; set
// EXPO_PUBLIC_GOLINK_COMING_SOON=0 to fully launch GoLink.

describe("isGoLinkComingSoon", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("default-on when unset > then coming-soon is true", () => {
    delete process.env.EXPO_PUBLIC_GOLINK_COMING_SOON;
    expect(isGoLinkComingSoon()).toBe(true);
  });

  it('given the literal "0" > then coming-soon is off', () => {
    vi.stubEnv("EXPO_PUBLIC_GOLINK_COMING_SOON", "0");
    expect(isGoLinkComingSoon()).toBe(false);
  });

  it('given any non-"0" value > then coming-soon stays on', () => {
    vi.stubEnv("EXPO_PUBLIC_GOLINK_COMING_SOON", "false");
    expect(isGoLinkComingSoon()).toBe(true);
  });
});

describe("resolveGoLinkMode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("given nothing set > then defaults to comingSoon (beta flips with no env change)", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
    delete process.env.EXPO_PUBLIC_GOLINK_COMING_SOON;
    expect(resolveGoLinkMode()).toBe("comingSoon");
    expect(isGoLinkEnabled()).toBe(false);
  });

  it('given EXPO_PUBLIC_GOLINK_COMING_SOON="0" > then enabled (fully clickable)', () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
    vi.stubEnv("EXPO_PUBLIC_GOLINK_COMING_SOON", "0");
    expect(resolveGoLinkMode()).toBe("enabled");
    expect(isGoLinkEnabled()).toBe(true);
  });

  it('given EXPO_PUBLIC_ENABLE_GOLINK="0" > then hidden wins even over coming-soon', () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOLINK", "0");
    delete process.env.EXPO_PUBLIC_GOLINK_COMING_SOON;
    expect(resolveGoLinkMode()).toBe("hidden");
    expect(isGoLinkEnabled()).toBe(false);
  });

  it('given ENABLE_GOLINK="0" AND COMING_SOON="0" > then hidden still wins', () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOLINK", "0");
    vi.stubEnv("EXPO_PUBLIC_GOLINK_COMING_SOON", "0");
    expect(resolveGoLinkMode()).toBe("hidden");
    expect(isGoLinkEnabled()).toBe(false);
  });
});
