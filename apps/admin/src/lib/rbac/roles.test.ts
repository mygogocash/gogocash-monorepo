import { describe, it, expect } from "vitest";
import { fromApiRole, DEFAULT_ROLE } from "@/lib/rbac/roles";

/**
 * The NestJS API and this admin UI use different role vocabularies:
 *   API:      viewer | support | approver | superadmin
 *   Frontend: super_admin | admin | editor | viewer
 * `fromApiRole` translates an API role (as returned by POST /admin/login) into
 * the frontend Role the UI gates on. Without it, the API's "superadmin" is not
 * a frontend Role and silently degrades to viewer (empty menu, /403).
 */
describe("fromApiRole", () => {
  it("maps the API 'superadmin' to the frontend 'super_admin'", () => {
    expect(fromApiRole("superadmin")).toBe("super_admin");
  });

  it("passes through the shared 'viewer' role unchanged", () => {
    expect(fromApiRole("viewer")).toBe("viewer");
  });

  it("maps API tiers without a frontend equivalent to least privilege", () => {
    // 'support' and 'approver' have no exact frontend tier; the UI must not
    // over-grant. API-side guards still enforce their real rights via the API token.
    expect(fromApiRole("support")).toBe("viewer");
    expect(fromApiRole("approver")).toBe("viewer");
  });

  it("falls back to the default role for missing/empty values", () => {
    expect(fromApiRole(undefined)).toBe(DEFAULT_ROLE);
    expect(fromApiRole(null)).toBe(DEFAULT_ROLE);
    expect(fromApiRole("")).toBe(DEFAULT_ROLE);
  });

  it("preserves an unknown non-empty id (forward-compat with custom roles)", () => {
    // A future API-issued custom role id should reach the dynamic role store
    // rather than being dropped here.
    expect(fromApiRole("ops_lead")).toBe("ops_lead");
  });
});
