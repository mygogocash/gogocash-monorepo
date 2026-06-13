"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionTab = { label: string; href: string };

const tabButtonClass = (selected: boolean) =>
  `inline-flex items-center -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
    selected
      ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
  }`;

/** Reusable underlined tab row for in-page section sub-navigation. */
export default function SectionTabs({
  tabs,
  ariaLabel,
  isActive = (pathname, href) => pathname === href,
}: {
  tabs: readonly SectionTab[];
  ariaLabel: string;
  isActive?: (pathname: string, href: string) => boolean;
}) {
  const pathname = usePathname();
  return (
    <div
      className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const selected = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={selected}
            className={tabButtonClass(selected)}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
