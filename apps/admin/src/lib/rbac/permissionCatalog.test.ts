import { describe, expect, it } from "vitest";

import { ALL_PERMISSIONS, type Permission } from "./permissions";
import {
  PERMISSION_CATEGORIES,
  PERMISSION_CATALOG,
  ROLE_TEMPLATES,
  applyPermissionToggle,
  getPermissionMeta,
  permissionsGroupedByCategory,
} from "./permissionCatalog";

describe("permissionCatalog > coverage", () => {
  it("given ALL_PERMISSIONS > then every key has catalog metadata", () => {
    for (const id of ALL_PERMISSIONS) {
      const meta = getPermissionMeta(id);
      expect(meta, `missing catalog entry for ${id}`).toBeDefined();
      expect(meta.id).toBe(id);
      expect(meta.label.length).toBeGreaterThan(3);
      expect(meta.description.length).toBeGreaterThan(12);
      expect(PERMISSION_CATEGORIES).toContain(meta.category);
    }
    expect(Object.keys(PERMISSION_CATALOG).sort()).toEqual(
      [...ALL_PERMISSIONS].sort(),
    );
  });

  it("given manage permissions > then they imply the matching view permission", () => {
    const managePerms = ALL_PERMISSIONS.filter((p) => p.endsWith(":manage"));
    for (const manage of managePerms) {
      const view = manage.replace(":manage", ":view") as Permission;
      expect(getPermissionMeta(manage).implies).toContain(view);
    }
  });

  it("given withdraw:approve and payments:refund > then they are critical and imply view", () => {
    expect(getPermissionMeta("withdraw:approve")).toMatchObject({
      risk: "critical",
      implies: expect.arrayContaining(["withdraw:view"]),
    });
    expect(getPermissionMeta("payments:refund")).toMatchObject({
      risk: "critical",
      implies: expect.arrayContaining(["payments:view"]),
    });
  });
});

describe("permissionCatalog > grouping", () => {
  it("given permissionsGroupedByCategory > then every permission appears once under its category", () => {
    const groups = permissionsGroupedByCategory();
    const seen = new Set<Permission>();
    for (const category of PERMISSION_CATEGORIES) {
      expect(groups[category]?.length).toBeGreaterThan(0);
      for (const meta of groups[category]) {
        expect(seen.has(meta.id)).toBe(false);
        seen.add(meta.id);
        expect(meta.category).toBe(category);
      }
    }
    expect(seen.size).toBe(ALL_PERMISSIONS.length);
  });
});

describe("permissionCatalog > applyPermissionToggle", () => {
  it("given enabling brands:manage > then also enables brands:view", () => {
    const next = applyPermissionToggle(new Set(), "brands:manage", true);
    expect(next.has("brands:manage")).toBe(true);
    expect(next.has("brands:view")).toBe(true);
  });

  it("given disabling brands:view while manage is on > then also clears brands:manage", () => {
    const start = new Set<Permission>(["brands:view", "brands:manage"]);
    const next = applyPermissionToggle(start, "brands:view", false);
    expect(next.has("brands:view")).toBe(false);
    expect(next.has("brands:manage")).toBe(false);
  });

  it("given disabling brands:manage > then keeps brands:view", () => {
    const start = new Set<Permission>(["brands:view", "brands:manage"]);
    const next = applyPermissionToggle(start, "brands:manage", false);
    expect(next.has("brands:manage")).toBe(false);
    expect(next.has("brands:view")).toBe(true);
  });
});

describe("permissionCatalog > role templates", () => {
  it("given ROLE_TEMPLATES > then each preset is non-empty and only uses known permissions", () => {
    expect(ROLE_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    for (const template of ROLE_TEMPLATES) {
      expect(template.label.length).toBeGreaterThan(2);
      expect(template.description.length).toBeGreaterThan(8);
      expect(template.permissions.length).toBeGreaterThan(0);
      for (const p of template.permissions) {
        expect(ALL_PERMISSIONS).toContain(p);
      }
    }
  });

  it("viewer clone template > given selection > then is view-only", () => {
    const viewer = ROLE_TEMPLATES.find((t) => t.id === "viewer_clone");
    expect(viewer).toBeDefined();
    expect(viewer!.permissions.every((p) => p.endsWith(":view"))).toBe(true);
  });
});
