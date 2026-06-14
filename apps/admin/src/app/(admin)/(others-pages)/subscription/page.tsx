import SubscriptionManagement from "@/components/subscription/SubscriptionManagement";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UsersManagementTabs from "@/components/user/UsersManagementTabs";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Subscription | GoGoCash Admin",
};

export default async function SubscriptionPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb pageTitle="Subscription" items={[{ label: "Home", href: "/" }, { label: "Subscription" }]} />
      <div className="mt-6 space-y-6">
        <UsersManagementTabs />
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          }
        >
          <SubscriptionManagement />
        </Suspense>
      </div>
    </div>
  );
}
