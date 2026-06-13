import AdminUsersTable from "@/components/admin/AdminUsersTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminManagementTabs from "@/components/admin/AdminManagementTabs";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Admin Users | TailAdmin - Next.js Dashboard Template",
};

export default async function AdminUsersPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb pageTitle="Admin Users" />
      <div className="mt-6 space-y-6">
        <AdminManagementTabs />
        <AdminUsersTable />
      </div>
    </div>
  );
}