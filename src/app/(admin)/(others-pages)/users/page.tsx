import UsersTable from "@/components/user/UsersTable";
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
    <div>
      <PageBreadcrumb pageTitle="Users" />
      <div className="space-y-6">
        <Suspense fallback={<div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</div>}>
          <UsersTable />
        </Suspense>
      </div>
    </div>
  );
}
