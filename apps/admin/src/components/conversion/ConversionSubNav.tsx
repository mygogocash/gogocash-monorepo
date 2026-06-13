"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const tabButtonClass = (selected: boolean) =>
  `inline-flex items-center -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
    selected
      ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
  }`;

export default function ConversionSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAddPage = pathname === "/conversion/add";
  const isTransactionsPage = pathname === "/transactions";
  const listTab = searchParams.get("tab") === "created" ? "created" : "lists";

  const listsActive = !isAddPage && !isTransactionsPage && listTab === "lists";
  const createdActive = !isAddPage && !isTransactionsPage && listTab === "created";
  const addActive = isAddPage;
  const transactionsActive = isTransactionsPage;

  return (
    <div
      className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800"
      role="tablist"
      aria-label="Conversion management sections"
    >
      <Link
        href="/conversion"
        role="tab"
        aria-selected={listsActive}
        className={tabButtonClass(listsActive)}
      >
        Conversion Lists
      </Link>
      <Link
        href="/conversion?tab=created"
        role="tab"
        aria-selected={createdActive}
        className={tabButtonClass(createdActive)}
      >
        Created Conversion
      </Link>
      <Link
        href="/conversion/add"
        role="tab"
        aria-selected={addActive}
        className={tabButtonClass(addActive)}
      >
        Add conversion
      </Link>
      <Link
        href="/transactions"
        role="tab"
        aria-selected={transactionsActive}
        className={tabButtonClass(transactionsActive)}
      >
        Transactions
      </Link>
    </div>
  );
}
