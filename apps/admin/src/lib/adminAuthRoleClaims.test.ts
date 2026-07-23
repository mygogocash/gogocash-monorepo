import { describe, expect, it } from "vitest";

import { resolveAdminAuthRoleClaims } from "./adminAuthRoleClaims";

describe("resolveAdminAuthRoleClaims", () => {
  it("preserves support for API-aligned actions while mapping UI access conservatively", () => {
    expect(resolveAdminAuthRoleClaims("support")).toEqual({
      apiRole: "support",
      role: "viewer",
    });
  });

  it("preserves a superadmin claim and maps its frontend tier", () => {
    expect(resolveAdminAuthRoleClaims("superadmin")).toEqual({
      apiRole: "superadmin",
      role: "super_admin",
    });
  });

  it("fails missing claims to the frontend default without inventing an API role", () => {
    expect(resolveAdminAuthRoleClaims(undefined)).toEqual({ role: "viewer" });
  });
});
