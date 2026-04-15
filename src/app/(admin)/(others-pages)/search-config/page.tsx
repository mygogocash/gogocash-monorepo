import SearchConfigManagement from "@/components/search-config/SearchConfigManagement";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import OffersManagementTabs from "@/components/offer/OffersManagementTabs";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Search Config | GoGoCash Admin",
};

export default async function SearchConfigPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Search Config"
        items={[{ label: "Home", href: "/" }, { label: "Search Config" }]}
      />
      <div className="mt-6 space-y-6">
        <OffersManagementTabs />
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          }
        >
          <SearchConfigManagement />
        </Suspense>
      </div>
    </div>
  );
}
