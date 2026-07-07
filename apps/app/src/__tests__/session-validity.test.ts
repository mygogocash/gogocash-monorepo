import { describe, expect, it } from "vitest";

import {
  DEMO_MOBILE_SESSION_TOKEN,
  hasUsableMobileSessionToken,
} from "@mobile/auth/sessionValidity";

describe("hasUsableMobileSessionToken", () => {
  it("session validity > given backend mode and demo-session token > then treats session as unusable", () => {
    expect(
      hasUsableMobileSessionToken({ access_token: DEMO_MOBILE_SESSION_TOKEN }, "backend"),
    ).toBe(false);
  });

  it("session validity > given fixtures mode and demo-session token > then allows fixtures auth", () => {
    expect(
      hasUsableMobileSessionToken({ access_token: DEMO_MOBILE_SESSION_TOKEN }, "fixtures"),
    ).toBe(true);
  });

  it("session validity > given backend mode and a real JWT > then allows auth", () => {
    expect(
      hasUsableMobileSessionToken({ access_token: "eyJhbGciOiJIUzI1NiJ9.test" }, "backend"),
    ).toBe(true);
  });
});
