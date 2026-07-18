import { describe, it, expect } from "vitest";
import { can, canAny, permissionForRoute } from "@/lib/rbac/permissions";
import { asRole, DEFAULT_ROLE } from "@/lib/rbac/roles";

describe("can", () => {
  it("super_admin can manage admin users", () => {
    expect(can("super_admin", "adminUsers:manage")).toBe(true);
  });

  it("admin can manage operations but NOT admin users", () => {
    expect(can("admin", "brands:manage")).toBe(true);
    expect(can("admin", "adminUsers:manage")).toBe(false);
  });

  it("editor can manage content but not money/admin", () => {
    expect(can("editor", "brands:manage")).toBe(true);
    expect(can("editor", "withdraw:manage")).toBe(false);
    expect(can("editor", "adminUsers:manage")).toBe(false);
  });

  it("viewer can only view", () => {
    expect(can("viewer", "dashboard:view")).toBe(true);
    expect(can("viewer", "activity:view")).toBe(true);
    expect(can("viewer", "brands:manage")).toBe(false);
  });

  it("no role can do nothing", () => {
    expect(can(null, "dashboard:view")).toBe(false);
    expect(can(undefined, "dashboard:view")).toBe(false);
  });
});

describe("canAny", () => {
  it("is true when the role holds at least one of the permissions", () => {
    expect(canAny("viewer", ["brands:manage", "dashboard:view"])).toBe(true);
    expect(canAny("viewer", ["brands:manage", "withdraw:manage"])).toBe(false);
  });
});

describe("permissionForRoute", () => {
  it("maps known routes (and nested paths) to a view permission", () => {
    expect(permissionForRoute("/admin-users")).toBe("adminUsers:view");
    expect(permissionForRoute("/withdraw/123")).toBe("withdraw:view");
    expect(permissionForRoute("/dashboard")).toBe("dashboard:view");
    expect(permissionForRoute("/activity")).toBe("activity:view");
  });

  it("returns null for unmapped routes", () => {
    expect(permissionForRoute("/totally-unknown")).toBeNull();
  });

  it("gates executive, category, discover and gogopass (were open)", () => {
    expect(permissionForRoute("/executive")).toBe("dashboard:view");
    expect(permissionForRoute("/category")).toBe("brands:view");
    expect(permissionForRoute("/discover")).toBe("brands:view");
    expect(permissionForRoute("/gogopass")).toBe("users:view");
  });
});

describe("asRole", () => {
  it("passes through valid roles and falls back otherwise", () => {
    expect(asRole("admin")).toBe("admin");
    expect(asRole("nope")).toBe(DEFAULT_ROLE);
    expect(asRole(undefined)).toBe("viewer");
  });
});
