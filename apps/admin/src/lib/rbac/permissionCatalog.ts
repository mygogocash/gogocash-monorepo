/**
 * Human-readable RBAC permission catalog for Role Management.
 *
 * Non-tech admins use labels/descriptions/risk — not raw `view`/`manage` verbs.
 * Keep every ALL_PERMISSIONS key covered (enforced by permissionCatalog.test.ts).
 */
import { ALL_PERMISSIONS, type Permission, type Resource } from "./permissions";

export type PermissionRisk = "low" | "medium" | "high" | "critical";

export const PERMISSION_CATEGORIES = [
  "platform",
  "customers",
  "admin_team",
  "brands_content",
  "money",
  "commerce",
  "engagement",
] as const;
export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[number];

export const PERMISSION_CATEGORY_LABELS: Record<PermissionCategory, string> = {
  platform: "Platform",
  customers: "Customers",
  admin_team: "Admin team",
  brands_content: "Brands & content",
  money: "Money & payouts",
  commerce: "Commerce catalog",
  engagement: "Coupons & quests",
};

export type PermissionEnforcementStatus =
  | "enforced"
  | "partial"
  | "catalog_only";

export type PermissionMeta = {
  id: Permission;
  label: string;
  description: string;
  includes?: string[];
  risk: PermissionRisk;
  category: PermissionCategory;
  resource: Resource;
  routes: string[];
  implies?: Permission[];
  status: PermissionEnforcementStatus;
};

export type RoleTemplate = {
  id: string;
  label: string;
  description: string;
  permissions: Permission[];
};

const RISK_ORDER: Record<PermissionRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function viewOf(resource: Resource): Permission {
  return `${resource}:view`;
}

function manageOf(resource: Resource): Permission {
  return `${resource}:manage`;
}

function entry(
  partial: Omit<PermissionMeta, "implies" | "status"> & {
    implies?: Permission[];
    status?: PermissionEnforcementStatus;
  },
): PermissionMeta {
  return {
    implies: partial.implies,
    status: partial.status ?? "enforced",
    ...partial,
  };
}

/** Full catalog — one entry per assignable permission. */
export const PERMISSION_CATALOG: Record<Permission, PermissionMeta> = {
  "dashboard:view": entry({
    id: "dashboard:view",
    label: "View dashboard",
    description:
      "Open Platform Dashboard and executive charts. Read-only — cannot change settings.",
    risk: "low",
    category: "platform",
    resource: "dashboard",
    routes: ["/dashboard", "/executive"],
  }),
  "dashboard:manage": entry({
    id: "dashboard:manage",
    label: "Manage dashboard",
    description:
      "Change dashboard configuration if available. Reserved for future admin controls.",
    includes: ["Edit dashboard settings"],
    risk: "medium",
    category: "platform",
    resource: "dashboard",
    routes: ["/dashboard", "/executive"],
    implies: [viewOf("dashboard")],
    status: "catalog_only",
  }),
  "activity:view": entry({
    id: "activity:view",
    label: "View activity",
    description: "See the activity / audit feed of recent admin and system events.",
    risk: "low",
    category: "platform",
    resource: "activity",
    routes: ["/activity"],
  }),
  "activity:manage": entry({
    id: "activity:manage",
    label: "Manage activity",
    description:
      "Clear or modify activity records if that tooling is enabled. Rarely needed.",
    risk: "medium",
    category: "platform",
    resource: "activity",
    routes: ["/activity"],
    implies: [viewOf("activity")],
    status: "catalog_only",
  }),

  "users:view": entry({
    id: "users:view",
    label: "View customers",
    description:
      "Browse GoGoCash customer accounts, membership, subscriptions, credit score, referrals, and GoGoPass.",
    risk: "medium",
    category: "customers",
    resource: "users",
    routes: [
      "/users",
      "/membership",
      "/subscription",
      "/credit-score",
      "/referral",
      "/gogopass",
    ],
  }),
  "users:manage": entry({
    id: "users:manage",
    label: "Manage customers",
    description:
      "Edit customer records and perform wallet / cashback adjustments that change balances.",
    includes: [
      "Update customer profile fields",
      "Adjust wallet / cashback (money-moving)",
      "Freeze or unfreeze wallets where available",
    ],
    risk: "high",
    category: "customers",
    resource: "users",
    routes: ["/users", "/withdraw"],
    implies: [viewOf("users")],
  }),

  "adminUsers:view": entry({
    id: "adminUsers:view",
    label: "View admin users",
    description: "See who is on the admin team and which role each person has.",
    risk: "medium",
    category: "admin_team",
    resource: "adminUsers",
    routes: ["/admin-users"],
  }),
  "adminUsers:manage": entry({
    id: "adminUsers:manage",
    label: "Manage admin team & roles",
    description:
      "Invite or remove admins, change their roles, and create/edit/delete custom roles. Highest trust — can grant any access.",
    includes: [
      "Invite admin users",
      "Change another admin’s role",
      "Open Roles page and edit permissions",
      "Delete custom roles",
    ],
    risk: "critical",
    category: "admin_team",
    resource: "adminUsers",
    routes: ["/admin-users", "/roles"],
    implies: [viewOf("adminUsers")],
  }),

  "brands:view": entry({
    id: "brands:view",
    label: "View brands",
    description:
      "Browse brands/offers, missing orders, search config, categories, and discover settings.",
    risk: "low",
    category: "brands_content",
    resource: "brands",
    routes: [
      "/brands",
      "/brands/create-brand",
      "/missing-orders",
      "/search-config",
      "/category",
      "/discover",
    ],
  }),
  "brands:manage": entry({
    id: "brands:manage",
    label: "Manage brands",
    description:
      "Create and edit brands, commissions, policies, top brands, and related brand tooling.",
    includes: [
      "Create brand from affiliate",
      "Edit offer / tracking period / media",
      "Save top brands order",
      "Update search config & categories",
    ],
    risk: "medium",
    category: "brands_content",
    resource: "brands",
    routes: [
      "/brands",
      "/brands/create-brand",
      "/missing-orders",
      "/search-config",
      "/category",
      "/discover",
    ],
    implies: [viewOf("brands")],
  }),

  "banner:view": entry({
    id: "banner:view",
    label: "View banners",
    description: "See home banners, all-brand banners, and modal popups.",
    risk: "low",
    category: "brands_content",
    resource: "banner",
    routes: ["/banner"],
  }),
  "banner:manage": entry({
    id: "banner:manage",
    label: "Manage banners",
    description: "Create, schedule, edit, and disable customer-facing banners and popups.",
    includes: ["Create/edit banners", "Schedule visibility", "Disable banners"],
    risk: "medium",
    category: "brands_content",
    resource: "banner",
    routes: ["/banner"],
    implies: [viewOf("banner")],
  }),

  "conversion:view": entry({
    id: "conversion:view",
    label: "View conversions",
    description: "See conversion lists, created conversions, and related transactions.",
    risk: "low",
    category: "brands_content",
    resource: "conversion",
    routes: ["/conversion", "/transactions"],
  }),
  "conversion:manage": entry({
    id: "conversion:manage",
    label: "Manage conversions",
    description: "Create or edit conversion records used for cashback tracking.",
    includes: ["Add conversion", "Edit conversion fields"],
    risk: "high",
    category: "brands_content",
    resource: "conversion",
    routes: ["/conversion", "/transactions"],
    implies: [viewOf("conversion")],
  }),

  "withdraw:view": entry({
    id: "withdraw:view",
    label: "View withdrawals",
    description: "Open Withdraw Management and see customer payout requests (read-only).",
    risk: "medium",
    category: "money",
    resource: "withdraw",
    routes: ["/withdraw"],
  }),
  "withdraw:manage": entry({
    id: "withdraw:manage",
    label: "Manage withdrawals",
    description:
      "Work withdrawal requests (notes, status updates) short of final approve/reject if approve is separate.",
    includes: ["Update withdrawal records", "Process operational withdraw actions"],
    risk: "high",
    category: "money",
    resource: "withdraw",
    routes: ["/withdraw"],
    implies: [viewOf("withdraw")],
  }),
  "withdraw:approve": entry({
    id: "withdraw:approve",
    label: "Approve withdrawals",
    description:
      "Approve or reject customer payouts. This moves real money — grant only to trusted finance staff.",
    includes: ["Approve payout", "Reject payout"],
    risk: "critical",
    category: "money",
    resource: "withdraw",
    routes: ["/withdraw"],
    implies: [viewOf("withdraw")],
    status: "partial",
  }),

  "fee:view": entry({
    id: "fee:view",
    label: "View fees",
    description: "See platform fee structure used when calculating commissions.",
    risk: "low",
    category: "money",
    resource: "fee",
    routes: ["/fee"],
  }),
  "fee:manage": entry({
    id: "fee:manage",
    label: "Manage fees",
    description: "Change the platform fee percent. Affects commission calculations for brands.",
    includes: ["Edit fee structure"],
    risk: "high",
    category: "money",
    resource: "fee",
    routes: ["/fee"],
    implies: [viewOf("fee")],
  }),

  "payments:view": entry({
    id: "payments:view",
    label: "View payments",
    description: "See commerce/payment records when that module is enabled.",
    risk: "medium",
    category: "money",
    resource: "payments",
    routes: [],
    status: "catalog_only",
  }),
  "payments:manage": entry({
    id: "payments:manage",
    label: "Manage payments",
    description: "Change payment records in the commerce module (when enabled).",
    risk: "high",
    category: "money",
    resource: "payments",
    routes: [],
    implies: [viewOf("payments")],
    status: "catalog_only",
  }),
  "payments:refund": entry({
    id: "payments:refund",
    label: "Refund payments",
    description:
      "Issue refunds against commerce payments. Money leaves the platform — treat as critical.",
    includes: ["Issue refund"],
    risk: "critical",
    category: "money",
    resource: "payments",
    routes: [],
    implies: [viewOf("payments")],
    status: "partial",
  }),

  "catalog:view": entry({
    id: "catalog:view",
    label: "View catalog",
    description: "Browse catalog products, shops, and catalog banners.",
    risk: "low",
    category: "commerce",
    resource: "catalog",
    routes: ["/catalog", "/catalog/products", "/catalog/shops", "/catalog/banners"],
  }),
  "catalog:manage": entry({
    id: "catalog:manage",
    label: "Manage catalog",
    description: "Create and edit catalog products, shops, and banners.",
    includes: ["Create/edit products", "Create/edit shops", "Edit catalog banners"],
    risk: "medium",
    category: "commerce",
    resource: "catalog",
    routes: ["/catalog", "/catalog/products", "/catalog/shops", "/catalog/banners"],
    implies: [viewOf("catalog")],
  }),
  "inventory:view": entry({
    id: "inventory:view",
    label: "View inventory",
    description: "See catalog inventory levels.",
    risk: "low",
    category: "commerce",
    resource: "inventory",
    routes: ["/catalog/inventory"],
  }),
  "inventory:manage": entry({
    id: "inventory:manage",
    label: "Manage inventory",
    description: "Adjust catalog inventory stock levels.",
    includes: ["Update stock counts"],
    risk: "medium",
    category: "commerce",
    resource: "inventory",
    routes: ["/catalog/inventory"],
    implies: [viewOf("inventory")],
  }),
  "orders:view": entry({
    id: "orders:view",
    label: "View orders",
    description: "See catalog orders placed by customers.",
    risk: "low",
    category: "commerce",
    resource: "orders",
    routes: ["/catalog/orders"],
  }),
  "orders:manage": entry({
    id: "orders:manage",
    label: "Manage orders",
    description: "Update catalog order status and fulfillment fields.",
    includes: ["Edit order status"],
    risk: "high",
    category: "commerce",
    resource: "orders",
    routes: ["/catalog/orders"],
    implies: [viewOf("orders")],
  }),

  "coupon:view": entry({
    id: "coupon:view",
    label: "View coupons",
    description: "See coupon campaigns and coupon history.",
    risk: "low",
    category: "engagement",
    resource: "coupon",
    routes: ["/coupon"],
  }),
  "coupon:manage": entry({
    id: "coupon:manage",
    label: "Manage coupons",
    description: "Create and edit coupon campaigns shown to customers.",
    includes: ["Create coupon", "Edit coupon", "Disable coupon"],
    risk: "medium",
    category: "engagement",
    resource: "coupon",
    routes: ["/coupon"],
    implies: [viewOf("coupon")],
  }),
  "quest:view": entry({
    id: "quest:view",
    label: "View quests",
    description: "See quest campaigns, rewards, and points tooling.",
    risk: "low",
    category: "engagement",
    resource: "quest",
    routes: ["/quest", "/reward", "/points"],
  }),
  "quest:manage": entry({
    id: "quest:manage",
    label: "Manage quests",
    description:
      "Create and edit quest campaigns and rewards. Some actions may still require Super Admin on the API.",
    includes: ["Create/edit quests", "Manage rewards"],
    risk: "medium",
    category: "engagement",
    resource: "quest",
    routes: ["/quest", "/reward", "/points"],
    implies: [viewOf("quest")],
    status: "partial",
  }),
};

export function getPermissionMeta(id: Permission): PermissionMeta {
  return PERMISSION_CATALOG[id];
}

export function permissionsGroupedByCategory(): Record<
  PermissionCategory,
  PermissionMeta[]
> {
  const groups = Object.fromEntries(
    PERMISSION_CATEGORIES.map((c) => [c, [] as PermissionMeta[]]),
  ) as Record<PermissionCategory, PermissionMeta[]>;

  for (const id of ALL_PERMISSIONS) {
    const meta = PERMISSION_CATALOG[id];
    groups[meta.category].push(meta);
  }

  for (const category of PERMISSION_CATEGORIES) {
    groups[category].sort(
      (a, b) =>
        RISK_ORDER[b.risk] - RISK_ORDER[a.risk] ||
        a.resource.localeCompare(b.resource) ||
        a.label.localeCompare(b.label),
    );
  }

  return groups;
}

/**
 * Toggle a permission with soft dependencies:
 * - enabling a permission also enables its `implies` (e.g. manage → view)
 * - disabling a permission also disables anything that implied it (e.g. clear view → clear manage)
 */
export function applyPermissionToggle(
  current: ReadonlySet<Permission>,
  permission: Permission,
  enabled: boolean,
): Set<Permission> {
  const next = new Set(current);
  if (enabled) {
    next.add(permission);
    for (const implied of PERMISSION_CATALOG[permission]?.implies ?? []) {
      next.add(implied);
    }
    return next;
  }

  next.delete(permission);
  for (const id of ALL_PERMISSIONS) {
    const implies = PERMISSION_CATALOG[id]?.implies ?? [];
    if (implies.includes(permission)) {
      next.delete(id);
    }
  }
  return next;
}

const allView = ALL_PERMISSIONS.filter((p) => p.endsWith(":view"));

/** Plug-and-play presets for Create role. */
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "viewer_clone",
    label: "Viewer (read-only)",
    description: "See every section; cannot change anything.",
    permissions: [...allView],
  },
  {
    id: "content_editor",
    label: "Content editor",
    description: "Manage brands, banners, coupons, quests, and conversions; read the rest.",
    permissions: [
      ...allView,
      manageOf("brands"),
      manageOf("banner"),
      manageOf("coupon"),
      manageOf("quest"),
      manageOf("conversion"),
    ],
  },
  {
    id: "support",
    label: "Support",
    description: "Read everything and manage customer accounts; no withdrawal approve or role admin.",
    permissions: [...allView, manageOf("users")],
  },
  {
    id: "finance_ops",
    label: "Finance ops",
    description: "Withdrawals (including approve), fees, and payment refunds — money-moving access.",
    permissions: [
      ...allView,
      manageOf("withdraw"),
      "withdraw:approve",
      manageOf("fee"),
      manageOf("payments"),
      "payments:refund",
      manageOf("users"),
    ],
  },
  {
    id: "ops_admin",
    label: "Ops admin (no IAM)",
    description: "Full operational access except inviting admins or editing roles.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "adminUsers:manage"),
  },
];

export const RISK_BADGE_CLASSES: Record<PermissionRisk, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  high: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};
