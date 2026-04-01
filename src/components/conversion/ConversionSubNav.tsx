"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function tabClass(active: boolean) {
  return `border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
    active
      ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
  }`;
}

export default function ConversionSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAddPage = pathname === "/conversion/add";
  const listTab = searchParams.get("tab") === "created" ? "created" : "lists";

  return (
    <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
      <Link href="/conversion" className={tabClass(!isAddPage && listTab === "lists")}>
        Conversion Lists
      </Link>
      <Link
        href="/conversion?tab=created"
        className={tabClass(!isAddPage && listTab === "created")}
      >
        Created Conversion
      </Link>
      <Link href="/conversion/add" className={tabClass(isAddPage)}>
        Add conversion
      </Link>
    </div>
  );
}
