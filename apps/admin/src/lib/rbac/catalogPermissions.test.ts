import { describe, expect, it } from "vitest";

import { ROLE_PERMISSIONS, permissionForRoute } from "./permissions";

describe("catalog RBAC permissions", () => {
  it("routes catalog admin pages to the expected read permissions", () => {
    expect(permissionForRoute("/catalog")).toBe("catalog:view");
    expect(permissionForRoute("/catalog/banners")).toBe("catalog:view");
    expect(permissionForRoute("/catalog/products")).toBe("catalog:view");
    expect(permissionForRoute("/catalog/inventory")).toBe("inventory:view");
    expect(permissionForRoute("/catalog/orders")).toBe("orders:view");
  });

  it("grants refund permission only to high-trust roles", () => {
    expect(ROLE_PERMISSIONS.super_admin).toContain("payments:refund");
    expect(ROLE_PERMISSIONS.admin).toContain("payments:refund");
    expect(ROLE_PERMISSIONS.viewer).not.toContain("payments:refund");
  });
});
