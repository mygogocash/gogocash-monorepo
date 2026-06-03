/**
 * Server-side, in-memory store of role → permissions — the single source of
 * truth for role permissions on the server (mock API + enforcement). Seeded
 * from the built-in tiers; super admins can add/edit/remove custom roles via
 * the Role Management page. Resets on restart (a real backend would persist).
 *
 * Server-only: do not import this from client components — they read roles via
 * the `/admin/roles` API (so custom roles created at runtime are visible).
 */
import type { Permission } from "./permissions";
import { ROLE_PERMISSIONS } from "./permissions";
import { ROLES, ROLE_LABELS, type Role } from "./roles";
import type { RoleDef } from "@/types/api";

const SYSTEM_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full access, including managing admin users and roles.",
  admin: "Full operational access; cannot manage admin users.",
  editor:
    "Manage content (brands, banners, coupons, quests, conversions); read the rest.",
  viewer: "Read-only access to everything.",
};

function seed(): RoleDef[] {
  return ROLES.map((id) => ({
    id,
    label: ROLE_LABELS[id],
    description: SYSTEM_DESCRIPTIONS[id],
    system: true,
    permissions: [...ROLE_PERMISSIONS[id]],
  }));
}

let roles: RoleDef[] = seed();

const clone = (r: RoleDef): RoleDef => ({
  ...r,
  permissions: [...r.permissions],
});

export function listRoles(): RoleDef[] {
  return roles.map(clone);
}

export function getRoleDef(id: string): RoleDef | undefined {
  const r = roles.find((x) => x.id === id);
  return r ? clone(r) : undefined;
}

export function permissionsForRole(id: string): Permission[] {
  return roles.find((x) => x.id === id)?.permissions ?? [];
}

export function roleCan(id: string, permission: Permission): boolean {
  return permissionsForRole(id).includes(permission);
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function createRole(input: {
  label: string;
  description?: string;
  permissions: Permission[];
}): RoleDef {
  const base = slugify(input.label) || "role";
  let id = base;
  let n = 2;
  while (roles.some((r) => r.id === id)) id = `${base}_${n++}`;
  const def: RoleDef = {
    id,
    label: input.label.trim() || id,
    description: input.description?.trim() || undefined,
    system: false,
    permissions: [...new Set(input.permissions)],
  };
  roles.push(def);
  return clone(def);
}

export function updateRole(
  id: string,
  patch: { label?: string; description?: string; permissions?: Permission[] },
): RoleDef | null {
  const r = roles.find((x) => x.id === id);
  if (!r) return null;
  if (patch.label != null && !r.system) r.label = patch.label.trim() || r.label;
  if (patch.description != null)
    r.description = patch.description.trim() || undefined;
  // super_admin is locked to full access (break-glass against self-lockout).
  if (patch.permissions != null && id !== "super_admin") {
    r.permissions = [...new Set(patch.permissions)];
  }
  return clone(r);
}

export function deleteRole(id: string): {
  ok: boolean;
  reason?: "not_found" | "system_role";
} {
  const r = roles.find((x) => x.id === id);
  if (!r) return { ok: false, reason: "not_found" };
  if (r.system) return { ok: false, reason: "system_role" };
  roles = roles.filter((x) => x.id !== id);
  return { ok: true };
}

/** Test-only: restore the seeded roles. */
export function __resetRolesForTest(): void {
  roles = seed();
}
