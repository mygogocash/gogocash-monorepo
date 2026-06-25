import { describe, expect, it } from "vitest";

import { isPublicPath } from "./proxy";

describe("isPublicPath", () => {
  it("allows unauthenticated password-reset and invite routes", () => {
    for (const path of [
      "/forgot-password",
      "/reset-password",
      "/accept-invite",
    ]) {
      expect(isPublicPath(path)).toBe(true);
    }
  });

  it("still protects authenticated admin routes", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/users")).toBe(false);
  });
});
