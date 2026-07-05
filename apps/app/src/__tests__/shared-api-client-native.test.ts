import { describe, expect, it } from "vitest";

import { prefersFirebaseIdTokenForApiAuth } from "../api/mobileApiAuthStrategy";

describe("prefersFirebaseIdTokenForApiAuth", () => {
  it("given Android > then API auth uses the backend JWT from SecureStore", () => {
    expect(prefersFirebaseIdTokenForApiAuth("android")).toBe(false);
  });

  it("given iOS > then API auth uses the backend JWT from SecureStore", () => {
    expect(prefersFirebaseIdTokenForApiAuth("ios")).toBe(false);
  });

  it("given web > then API auth may prefer a Firebase ID token", () => {
    expect(prefersFirebaseIdTokenForApiAuth("web")).toBe(true);
  });
});
