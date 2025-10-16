import UsersTable from "@/components/user/UsersTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users | TailAdmin - Next.js Dashboard Template",
  description: "Manage users in your dashboard",
};

export default function UsersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Users" />
      <div className="space-y-6">
        <UsersTable />
      </div>
    </div>
  );
}
