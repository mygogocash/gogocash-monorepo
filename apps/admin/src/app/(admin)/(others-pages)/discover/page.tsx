import DiscoverManagement from "@/components/discover/DiscoverManagement";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Discover | GoGoCash Admin",
};

export default async function DiscoverPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Discover" items={[{ label: "Home", href: "/" }, { label: "Discover" }]} />
      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          }
        >
          <DiscoverManagement />
        </Suspense>
      </div>
    </div>
  );
}
