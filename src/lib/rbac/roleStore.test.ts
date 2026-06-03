import { beforeEach, describe, it, expect } from "vitest";
import {
  listRoles,
  getRoleDef,
  roleCan,
  createRole,
  updateRole,
  deleteRole,
  __resetRolesForTest,
} from "@/lib/rbac/roleStore";

beforeEach(() => __resetRolesForTest());

describe("roleStore seed", () => {
  it("seeds the four built-in roles as system roles", () => {
    const ids = listRoles()
      .map((r) => r.id)
      .sort();
    expect(ids).toEqual(["admin", "editor", "super_admin", "viewer"]);
    expect(listRoles().every((r) => r.system)).toBe(true);
  });

  it("roleCan reflects built-in permissions", () => {
    expect(roleCan("super_admin", "adminUsers:manage")).toBe(true);
    expect(roleCan("viewer", "adminUsers:manage")).toBe(false);
    expect(roleCan("viewer", "dashboard:view")).toBe(true);
  });
});

describe("createRole", () => {
  it("creates a custom role with a slug id and its permissions", () => {
    const r = createRole({
      label: "Support Lead",
      permissions: ["users:view", "conversion:view"],
    });
    expect(r.id).toBe("support_lead");
    expect(r.system).toBe(false);
    expect(roleCan("support_lead", "users:view")).toBe(true);
    expect(roleCan("support_lead", "users:manage")).toBe(false);
  });

  it("dedupes ids on collision", () => {
    expect(createRole({ label: "Dup", permissions: [] }).id).toBe("dup");
    expect(createRole({ label: "Dup", permissions: [] }).id).toBe("dup_2");
  });
});

describe("updateRole", () => {
  it("updates a custom role's permissions", () => {
    createRole({ label: "Temp", permissions: [] });
    updateRole("temp", { permissions: ["brands:view"] });
    expect(roleCan("temp", "brands:view")).toBe(true);
  });

  it("keeps super_admin at full access even if asked to reduce it", () => {
    updateRole("super_admin", { permissions: ["dashboard:view"] });
    expect(roleCan("super_admin", "adminUsers:manage")).toBe(true);
  });
});

describe("deleteRole", () => {
  it("deletes custom roles", () => {
    createRole({ label: "Throwaway", permissions: [] });
    expect(deleteRole("throwaway").ok).toBe(true);
    expect(getRoleDef("throwaway")).toBeUndefined();
  });

  it("refuses to delete system roles", () => {
    const res = deleteRole("admin");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("system_role");
    expect(getRoleDef("admin")).toBeDefined();
  });
});
