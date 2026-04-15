import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import MyCashbackUsersTable from "@/components/user/MyCashbackUsersTable";
import UsersManagementTabs from "@/components/user/UsersManagementTabs";
import { Metadata } from "next";
import { Suspense } from "react";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "MyCashBack Users | GoGoCash Admin",
  description: "Browse MyCashBack program users in the admin panel.",
};

export default async function MyCashbackUsersPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="MyCashBack Users"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Users", href: "/users" },
          { label: "MyCashBack Users" },
        ]}
      />
      <div className="mt-6 space-y-6">
        <UsersManagementTabs />
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          }
        >
          <MyCashbackUsersTable />
        </Suspense>
      </div>
    </div>
  );
}
