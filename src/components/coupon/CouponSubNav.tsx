"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/coupon", label: "Coupon" },
  { href: "/coupon/history", label: "Coupon History" },
] as const;

function tabClass(active: boolean) {
  return `border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
    active
      ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
  }`;
}

export default function CouponSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
      {NAV.map((item) => {
        const active =
          item.href === "/coupon" ? pathname === "/coupon" : pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={tabClass(active)}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
