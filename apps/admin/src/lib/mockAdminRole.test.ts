import { describe, it, expect } from "vitest";
import { mockRoleForEmail, resolveTokenRole } from "@/lib/mockAdminRole";
import { DEFAULT_ROLE } from "@/lib/rbac";

describe("mockRoleForEmail", () => {
  it("uses a known admin user's assigned role", () => {
    expect(mockRoleForEmail("admin@gogocash.co")).toBe("super_admin");
  });

  it("maps demo email prefixes to tiers", () => {
    expect(mockRoleForEmail("viewer@demo.co")).toBe("viewer");
    expect(mockRoleForEmail("editor@demo.co")).toBe("editor");
    expect(mockRoleForEmail("operator@demo.co")).toBe("admin");
    expect(mockRoleForEmail("manager@demo.co")).toBe("admin");
  });

  it("defaults an unknown email to super_admin (mock convenience)", () => {
    expect(mockRoleForEmail("someone@nowhere.co")).toBe("super_admin");
  });
});

describe("resolveTokenRole", () => {
  it("preserves an already-resolved role id (incl. custom)", () => {
    expect(resolveTokenRole("finance_manager", "x@y.co", false)).toBe(
      "finance_manager",
    );
    expect(resolveTokenRole("editor", "x@y.co", true)).toBe("editor");
  });

  it("backfills to least-privilege (DEFAULT_ROLE) against a real backend", () => {
    expect(resolveTokenRole(undefined, "someone@nowhere.co", false)).toBe(
      DEFAULT_ROLE,
    );
    expect(resolveTokenRole("", "admin@anything.co", false)).toBe(DEFAULT_ROLE);
  });

  it("uses the email mapping only in mock-auth mode", () => {
    expect(resolveTokenRole(undefined, "someone@nowhere.co", true)).toBe(
      "super_admin",
    );
    expect(resolveTokenRole(null, "viewer@demo.co", true)).toBe("viewer");
  });
});
