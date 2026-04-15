"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Mirrors `AppSidebarContent` → Users Management submenu (order and paths). */
export const USERS_MANAGEMENT_NAV = [
  { label: "Users Admin", href: "/admin-users" },
  { label: "GoGoCash Users", href: "/users" },
  { label: "MyCashBack Users", href: "/users/mycashback" },
  { label: "Membership", href: "/membership" },
  { label: "Subscription", href: "/subscription" },
  { label: "Credit score", href: "/credit-score" },
  { label: "Referral", href: "/referral" },
  { label: "Wallet", href: "/wallet" },
] as const;

const tabButtonClass = (selected: boolean) =>
  `inline-flex items-center -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
    selected
      ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
  }`;

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/users") {
    return pathname === "/users";
  }
  return pathname === href;
}

export default function UsersManagementTabs() {
  const pathname = usePathname();
  return (
    <div
      className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800"
      role="tablist"
      aria-label="Users management sections"
    >
      {USERS_MANAGEMENT_NAV.map((item) => {
        const selected = isTabActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={selected}
            className={tabButtonClass(selected)}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
