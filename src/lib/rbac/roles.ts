/**
 * RBAC role definitions (tiered model). Pure, dependency-free so it can be
 * imported from client components, server route handlers, and middleware alike.
 */

export const ROLES = ["super_admin", "admin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

/** Least-privilege fallback when a session/token has no role yet. */
export const DEFAULT_ROLE: Role = "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

/** Badge styling per role for tables/menus. */
export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  super_admin:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  editor:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

/** Badge classes for a role id — built-in tiers use their color; custom roles
 *  fall back to a brand chip. */
export function roleBadgeClass(id: string): string {
  return (
    ROLE_BADGE_CLASSES[id as keyof typeof ROLE_BADGE_CLASSES] ??
    "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
  );
}

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/** Coerce an unknown value (token/db field) into a Role, falling back safely. */
export function asRole(value: unknown, fallback: Role = DEFAULT_ROLE): Role {
  return isRole(value) ? value : fallback;
}
