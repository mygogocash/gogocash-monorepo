"use client";

import SectionTabs from "@/components/common/SectionTabs";
import { filterHiddenAdminItems } from "@/config/featureFlags";

/** Mirrors `AppSidebarContent` → Users Management submenu (order and paths).
 *  Admin-panel accounts/roles live under Admin Management (AdminManagementTabs). */
const USERS_MANAGEMENT_NAV = [
  { label: "GoGoCash Users", href: "/users" },
  { label: "MyCashBack Users", href: "/users/mycashback" },
  { label: "Membership", href: "/membership" },
  { label: "Subscription", href: "/subscription" },
  { label: "Credit score", href: "/credit-score" },
  { label: "Referral", href: "/referral" },
] as const;

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/users") return pathname === "/users";
  return pathname === href;
}

export default function UsersManagementTabs() {
  // Hide pre-launch tabs (Membership/Subscription behind GOGOPASS, Credit score
  // behind CREDIT_SCORE) when their NEXT_PUBLIC_ENABLE_* flag is "0"; default-on.
  const tabs = filterHiddenAdminItems(USERS_MANAGEMENT_NAV);
  return (
    <SectionTabs
      tabs={tabs}
      ariaLabel="Users management sections"
      isActive={isTabActive}
    />
  );
}
