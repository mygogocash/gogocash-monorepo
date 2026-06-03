/**
 * RBAC permission matrix + checks. Permissions are `${resource}:${action}`
 * strings; roles map to the permissions they hold. Pure and unit-tested so the
 * same logic backs UI gating, route middleware, and API enforcement.
 */
import type { Role } from "./roles";

export const RESOURCES = [
  "dashboard",
  "users",
  "adminUsers",
  "brands",
  "withdraw",
  "fee",
  "conversion",
  "banner",
  "coupon",
  "quest",
] as const;
export type Resource = (typeof RESOURCES)[number];
export type Action = "view" | "manage";
export type Permission = `${Resource}:${Action}` | "withdraw:approve";

const allView = RESOURCES.map((r) => `${r}:view` as Permission);
const allManage = RESOURCES.map((r) => `${r}:manage` as Permission);

/** Every assignable permission — used by the Role Management permission picker. */
export const ALL_PERMISSIONS: Permission[] = [
  ...RESOURCES.flatMap((r) => [`${r}:view`, `${r}:manage`] as Permission[]),
  "withdraw:approve",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [...allView, ...allManage, "withdraw:approve"],
  // Full operational access, but cannot manage other admins / their roles.
  admin: [
    ...allView,
    ...allManage.filter((p) => p !== "adminUsers:manage"),
    "withdraw:approve",
  ],
  // Content operations only; read everything else.
  editor: [
    ...allView,
    "brands:manage",
    "banner:manage",
    "coupon:manage",
    "quest:manage",
    "conversion:manage",
  ],
  viewer: [...allView],
};

/** Pathname prefix → permission required to view that route. */
const ROUTE_VIEW_PERMISSION: { prefix: string; permission: Permission }[] = [
  { prefix: "/admin-users", permission: "adminUsers:view" },
  { prefix: "/roles", permission: "adminUsers:manage" },
  { prefix: "/users", permission: "users:view" },
  { prefix: "/membership", permission: "users:view" },
  { prefix: "/subscription", permission: "users:view" },
  { prefix: "/credit-score", permission: "users:view" },
  { prefix: "/referral", permission: "users:view" },
  { prefix: "/wallet", permission: "users:view" },
  { prefix: "/brands", permission: "brands:view" },
  { prefix: "/missing-orders", permission: "brands:view" },
  { prefix: "/search-config", permission: "brands:view" },
  { prefix: "/category", permission: "brands:view" },
  { prefix: "/discover", permission: "brands:view" },
  { prefix: "/gogopass", permission: "users:view" },
  { prefix: "/executive", permission: "dashboard:view" },
  { prefix: "/withdraw", permission: "withdraw:view" },
  { prefix: "/fee", permission: "fee:view" },
  { prefix: "/conversion", permission: "conversion:view" },
  { prefix: "/transactions", permission: "conversion:view" },
  { prefix: "/banner", permission: "banner:view" },
  { prefix: "/coupon", permission: "coupon:view" },
  { prefix: "/quest", permission: "quest:view" },
  { prefix: "/reward", permission: "quest:view" },
  { prefix: "/points", permission: "quest:view" },
  { prefix: "/dashboard", permission: "dashboard:view" },
];

export function can(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAny(
  role: Role | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => can(role, p));
}

/** The permission needed to view a route, or null if the route isn't gated. */
export function permissionForRoute(pathname: string): Permission | null {
  const match = ROUTE_VIEW_PERMISSION.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  return match?.permission ?? null;
}
