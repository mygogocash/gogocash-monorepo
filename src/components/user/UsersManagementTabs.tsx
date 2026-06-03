"use client";

import SectionTabs from "@/components/common/SectionTabs";

/** Mirrors `AppSidebarContent` → Users Management submenu (order and paths).
 *  Admin-panel accounts/roles live under Admin Management (AdminManagementTabs). */
export const USERS_MANAGEMENT_NAV = [
  { label: "GoGoCash Users", href: "/users" },
  { label: "MyCashBack Users", href: "/users/mycashback" },
  { label: "Membership", href: "/membership" },
  { label: "Subscription", href: "/subscription" },
  { label: "Credit score", href: "/credit-score" },
  { label: "Referral", href: "/referral" },
  { label: "Wallet", href: "/wallet" },
] as const;

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/users") return pathname === "/users";
  return pathname === href;
}

export default function UsersManagementTabs() {
  return (
    <SectionTabs
      tabs={USERS_MANAGEMENT_NAV}
      ariaLabel="Users management sections"
      isActive={isTabActive}
    />
  );
}
