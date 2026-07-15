import MissingOrdersManagement from "@/components/missing-orders/MissingOrdersManagement";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import OffersManagementTabs from "@/components/offer/OffersManagementTabs";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Missing Conversions | GoGoCash Admin",
};

export default async function MissingOrdersPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Missing Conversions"
        items={[{ label: "Home", href: "/" }, { label: "Missing Conversions" }]}
      />
      <div className="mt-6 space-y-6">
        <OffersManagementTabs />
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          }
        >
          <MissingOrdersManagement />
        </Suspense>
      </div>
    </div>
  );
}
