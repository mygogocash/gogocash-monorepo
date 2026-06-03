import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminManagementTabs from "@/components/admin/AdminManagementTabs";
import RoleManagement from "@/components/admin/RoleManagement";
import { Metadata } from "next";
import {
  awaitPageDynamicProps,
  type DefaultAppPageProps,
} from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Roles | GoGoCash Admin",
};

export default async function RolesPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Roles"
        items={[
          { label: "Home", href: "/" },
          { label: "Admin Users", href: "/admin-users" },
          { label: "Roles" },
        ]}
      />
      <div className="mt-6 space-y-6">
        <AdminManagementTabs />
        <RoleManagement />
      </div>
    </div>
  );
}
