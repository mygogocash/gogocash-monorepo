import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getConfiguredFrontendOrigin,
  resolveLineLoginOrigin,
  shouldRedirectToCanonicalWebOrigin,
} from "@mobile/auth/canonicalWebOrigin";

describe("canonicalWebOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getConfiguredFrontendOrigin > given EXPO_PUBLIC_FRONTEND_URL > returns origin", () => {
    expect(getConfiguredFrontendOrigin("https://app-staging.gogocash.co/")).toBe(
      "https://app-staging.gogocash.co",
    );
  });

  it("resolveLineLoginOrigin > prefers configured frontend over the current alias host", () => {
    vi.stubEnv("EXPO_PUBLIC_FRONTEND_URL", "https://app-staging.gogocash.co");
    expect(resolveLineLoginOrigin("https://staging.gogocash.co/login")).toBe(
      "https://app-staging.gogocash.co",
    );
  });

  it("shouldRedirectToCanonicalWebOrigin > redirects staging.gogocash.co alias to app-staging", () => {
    expect(
      shouldRedirectToCanonicalWebOrigin(
        "https://staging.gogocash.co/login?callbackUrl=%2Fwallet",
        "https://app-staging.gogocash.co",
      ),
    ).toBe("https://app-staging.gogocash.co/login?callbackUrl=%2Fwallet");
  });

  it("shouldRedirectToCanonicalWebOrigin > leaves the canonical host alone", () => {
    expect(
      shouldRedirectToCanonicalWebOrigin(
        "https://app-staging.gogocash.co/login",
        "https://app-staging.gogocash.co",
      ),
    ).toBeNull();
  });

  it("shouldRedirectToCanonicalWebOrigin > does not redirect unrelated hosts", () => {
    expect(
      shouldRedirectToCanonicalWebOrigin(
        "http://localhost:8081/login",
        "https://app-staging.gogocash.co",
      ),
    ).toBeNull();
  });
});
