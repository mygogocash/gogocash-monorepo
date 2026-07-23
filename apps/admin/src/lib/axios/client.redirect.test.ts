import { describe, expect, it } from "vitest";

import { SIGN_IN_PATH, shouldRedirectToSignInOn401 } from "./client";

describe("shouldRedirectToSignInOn401", () => {
  const base = {
    status: 401 as number | undefined,
    realApi: true,
    isBrowser: true,
    pathname: "/policy",
  };

  it("given a 401 in the browser against the real API > then redirects to sign-in", () => {
    expect(shouldRedirectToSignInOn401(base)).toBe(true);
    expect(SIGN_IN_PATH).toBe("/signin");
  });

  it("given a non-401 status > then does not redirect", () => {
    expect(shouldRedirectToSignInOn401({ ...base, status: 403 })).toBe(false);
    expect(shouldRedirectToSignInOn401({ ...base, status: undefined })).toBe(
      false,
    );
  });

  it("given mock mode > then does not redirect (mock login legitimately 401s)", () => {
    expect(shouldRedirectToSignInOn401({ ...base, realApi: false })).toBe(
      false,
    );
  });

  it("given a non-browser context > then does not redirect", () => {
    expect(shouldRedirectToSignInOn401({ ...base, isBrowser: false })).toBe(
      false,
    );
  });

  it("given the browser is already on the sign-in page > then does not redirect (no reload loop)", () => {
    expect(
      shouldRedirectToSignInOn401({ ...base, pathname: "/signin" }),
    ).toBe(false);
  });

  it("given a resource-not-found 401 body > then does not redirect (not session expiry)", () => {
    expect(
      shouldRedirectToSignInOn401({
        ...base,
        data: { message: "User not found" },
      }),
    ).toBe(false);
  });
});
