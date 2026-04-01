"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo } from "react";

const OffersTable = dynamic(() => import("./OffersTable").then((m) => m.default), {
  loading: () => <TabPanelSkeleton />,
});

const CommissionManagementClient = dynamic(
  () => import("@/components/commission/CommissionManagementClient").then((m) => m.default),
  { loading: () => <TabPanelSkeleton /> },
);

const PolicyTable = dynamic(() => import("@/components/policy/PolicyTable").then((m) => m.default), {
  loading: () => <TabPanelSkeleton />,
});

const DeeplinkTable = dynamic(
  () => import("@/components/deeplink/DeeplinkTable").then((m) => m.default),
  { loading: () => <TabPanelSkeleton /> },
);

function TabPanelSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="h-7 w-56 rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="mt-6 space-y-3">
        <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-32 w-full rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-32 w-full rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

const TABS = [
  { id: "offers" as const, label: "Offers", breadcrumb: "Offers" },
  {
    id: "commission" as const,
    label: "Commission Management",
    breadcrumb: "Commission Management",
  },
  {
    id: "policy" as const,
    label: "Policy Management",
    breadcrumb: "Policy Management",
  },
  {
    id: "deeplink" as const,
    label: "User Deeplink",
    breadcrumb: "User Deeplink",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function tabFromSearch(tabParam: string | null): TabId {
  if (tabParam === "policy") return "policy";
  if (tabParam === "deeplink") return "deeplink";
  if (tabParam === "commission") return "commission";
  return "offers";
}

export default function OffersManagementPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = tabFromSearch(searchParams.get("tab"));

  useEffect(() => {
    if (searchParams.get("tab") === "category") {
      router.replace("/category");
    }
  }, [router, searchParams]);

  const setTab = useCallback(
    (id: TabId) => {
      const next = new URLSearchParams(searchParams.toString());
      if (id === "offers") next.delete("tab");
      else next.set("tab", id);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const breadcrumbMeta = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab)!;
    return {
      pageTitle: tab.breadcrumb,
      items: [
        { label: "Home", href: "/" },
        { label: "Offers Management", href: "/offers" },
        { label: tab.breadcrumb },
      ],
    };
  }, [activeTab]);

  return (
    <div>
      <PageBreadcrumb
        pageTitle={breadcrumbMeta.pageTitle}
        items={breadcrumbMeta.items}
      />
      <div className="space-y-6">
        <div
          className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800"
          role="tablist"
          aria-label="Offers management sections"
        >
          {TABS.map((t) => {
            const selected = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  selected
                    ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "offers" && <OffersTable />}
        {activeTab === "commission" && <CommissionManagementClient embedded />}
        {activeTab === "policy" && <PolicyTable />}
        {activeTab === "deeplink" && <DeeplinkTable />}
      </div>
    </div>
  );
}
