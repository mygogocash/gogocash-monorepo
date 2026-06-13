"use client";

import SectionTabs from "@/components/common/SectionTabs";
import { usePermissions } from "@/hooks/usePermissions";
import type { Permission } from "@/lib/rbac";

/** Mirrors `AppSidebarContent` → Admin Management submenu (order and paths). */
export const ADMIN_MANAGEMENT_NAV: {
  label: string;
  href: string;
  permission?: Permission;
}[] = [
  { label: "Users Admin", href: "/admin-users", permission: "adminUsers:view" },
  { label: "Roles", href: "/roles", permission: "adminUsers:manage" },
];

export default function AdminManagementTabs() {
  const { can } = usePermissions();
  const tabs = ADMIN_MANAGEMENT_NAV.filter(
    (i) => !i.permission || can(i.permission),
  );
  return <SectionTabs tabs={tabs} ariaLabel="Admin management sections" />;
}
