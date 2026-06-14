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

/**
 * The NestJS API uses a different role vocabulary than this UI:
 *   API:      viewer | support | approver | superadmin
 *   Frontend: super_admin | admin | editor | viewer
 * Known API tiers that have no exact frontend equivalent map to least
 * privilege — the UI must never over-grant. API-side guards still enforce
 * each admin's real rights via the separate API token, so under-granting in
 * the UI is safe.
 */
const API_ROLE_TO_FRONTEND: Record<string, Role> = {
  superadmin: "super_admin",
  viewer: "viewer",
  support: "viewer",
  approver: "viewer",
};

/**
 * Translate a role as issued by the API (POST /admin/login) into the role the
 * UI gates on. Without this, the API's `superadmin` is not a frontend `Role`
 * and silently degrades to `viewer` (empty menu, /403). Unknown non-empty ids
 * are preserved so future API-issued custom roles still reach the dynamic
 * role store; missing/empty values fall back to least privilege.
 */
export function fromApiRole(apiRole: unknown): string {
  if (typeof apiRole !== "string" || !apiRole) return DEFAULT_ROLE;
  return API_ROLE_TO_FRONTEND[apiRole] ?? apiRole;
}

/** Coerce an unknown value (token/db field) into a Role, falling back safely. */
export function asRole(value: unknown, fallback: Role = DEFAULT_ROLE): Role {
  return isRole(value) ? value : fallback;
}
