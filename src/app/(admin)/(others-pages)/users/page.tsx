import UsersTable from "@/components/user/UsersTable";
import UsersManagementTabs from "@/components/user/UsersManagementTabs";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Users | TailAdmin - Next.js Dashboard Template",
};

export default async function UsersPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb pageTitle="Users" />
      <div className="mt-6 space-y-6">
        <UsersManagementTabs />
        <Suspense fallback={<div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>}>
          <UsersTable />
        </Suspense>
      </div>
    </div>
  );
}
