import AdminUsersTable from "@/components/admin/AdminUsersTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Users | TailAdmin - Next.js Dashboard Template",
};

export default function AdminUsersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Admin Users" />
      <div className="space-y-6">
        <AdminUsersTable />
      </div>
    </div>
  );
}