"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import OffersManagementTabs, {
  offersManagementTabFromSearch,
  type OffersManagementTabId,
} from "./OffersManagementTabs";

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

const TopBrandManagementPanel = dynamic(
  () => import("./TopBrandManagementPanel").then((m) => m.default),
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

const BREADCRUMB_LABEL: Record<OffersManagementTabId, string> = {
  offers: "Offers",
  commission: "Commission Management",
  policy: "Policy Management",
  deeplink: "User Deeplink",
  "top-brands": "Top brands",
};

export default function OffersManagementPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = offersManagementTabFromSearch(searchParams.get("tab"));

  useEffect(() => {
    if (searchParams.get("tab") === "category") {
      router.replace("/category");
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (searchParams.get("tab") === "new-offer") {
      router.replace("/offers", { scroll: false });
    }
  }, [router, searchParams]);

  const breadcrumbMeta = useMemo(() => {
    const pageTitle = BREADCRUMB_LABEL[activeTab];
    return {
      pageTitle,
      items: [
        { label: "Home", href: "/" },
        { label: "Offers Management", href: "/offers" },
        { label: pageTitle },
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
        <OffersManagementTabs />

        {activeTab === "offers" && <OffersTable />}
        {activeTab === "commission" && <CommissionManagementClient embedded />}
        {activeTab === "policy" && <PolicyTable />}
        {activeTab === "deeplink" && <DeeplinkTable />}
        {activeTab === "top-brands" && <TopBrandManagementPanel />}
      </div>
    </div>
  );
}
