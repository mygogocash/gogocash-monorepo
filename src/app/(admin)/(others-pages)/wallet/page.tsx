import WalletManagement from "@/components/wallet/WalletManagement";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UsersManagementTabs from "@/components/user/UsersManagementTabs";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Wallet | GoGoCash Admin",
};

export default async function WalletPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb pageTitle="Wallet" items={[{ label: "Home", href: "/" }, { label: "Wallet" }]} />
      <div className="mt-6 space-y-6">
        <UsersManagementTabs />
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          }
        >
          <WalletManagement />
        </Suspense>
      </div>
    </div>
  );
}
