import AdminUsersTable from "@/components/admin/AdminUsersTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Admin Users | TailAdmin - Next.js Dashboard Template",
};

export default async function AdminUsersPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Admin Users" />
      <div className="space-y-6">
        <AdminUsersTable />
      </div>
    </div>
  );
}