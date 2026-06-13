"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export const OFFERS_MANAGEMENT_TABS = [
  { id: "brands" as const, label: "Brands" },
  {
    id: "commission" as const,
    label: "Commission Management",
  },
  {
    id: "policy" as const,
    label: "Policy Management",
  },
  {
    id: "deeplink" as const,
    label: "User tracking link",
  },
  {
    id: "top-brands" as const,
    label: "Top brands",
  },
] as const;

export type OffersManagementTabId = (typeof OFFERS_MANAGEMENT_TABS)[number]["id"];

export function offersManagementTabFromSearch(tabParam: string | null): OffersManagementTabId {
  if (tabParam === "policy") return "policy";
  if (tabParam === "deeplink") return "deeplink";
  if (tabParam === "commission") return "commission";
  if (tabParam === "top-brands") return "top-brands";
  if (tabParam === "offers") return "brands";
  return "brands";
}

const tabButtonClass = (selected: boolean) =>
  `inline-flex items-center -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
    selected
      ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
  }`;

export default function OffersManagementTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const createBrandActive = pathname === "/brands/create-brand";
  const queryActiveTab = offersManagementTabFromSearch(searchParams.get("tab"));

  const setTab = useCallback(
    (id: OffersManagementTabId) => {
      const next = new URLSearchParams(searchParams.toString());
      if (id === "brands") next.delete("tab");
      else next.set("tab", id);
      const qs = next.toString();
      router.push(qs ? `/brands?${qs}` : "/brands", { scroll: false });
    },
    [router, searchParams],
  );

  const onBrandsListWithTabs = pathname === "/brands";
  const missingOrdersActive = pathname === "/missing-orders";
  const searchConfigActive = pathname === "/search-config";

  const renderQueryTab = (t: (typeof OFFERS_MANAGEMENT_TABS)[number]) => {
    const selected =
      onBrandsListWithTabs && !createBrandActive && queryActiveTab === t.id;
    return (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={selected}
        onClick={() => setTab(t.id)}
        className={tabButtonClass(selected)}
      >
        {t.label}
      </button>
    );
  };

  return (
    <div
      className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800"
      role="tablist"
      aria-label="Brands management sections"
    >
      <Link
        href="/brands/create-brand"
        role="tab"
        aria-selected={createBrandActive}
        className={tabButtonClass(createBrandActive)}
      >
        Create brand
      </Link>
      {OFFERS_MANAGEMENT_TABS.map((t) => renderQueryTab(t))}
      <Link
        href="/missing-orders"
        role="tab"
        aria-selected={missingOrdersActive}
        className={tabButtonClass(missingOrdersActive)}
      >
        Missing orders
      </Link>
      <Link
        href="/search-config"
        role="tab"
        aria-selected={searchConfigActive}
        className={tabButtonClass(searchConfigActive)}
      >
        Search Management
      </Link>
    </div>
  );
}
