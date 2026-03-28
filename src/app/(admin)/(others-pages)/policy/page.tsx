import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PolicyTable from "@/components/policy/PolicyTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Policy Management | GoGoCash Admin",
  description: "Manage terms and conditions per category",
};

export default function PolicyPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Policy Management" />
      <div className="mt-6">
        <PolicyTable />
      </div>
    </div>
  );
}
