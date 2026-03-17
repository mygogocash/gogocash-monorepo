import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import CategoryTable from "@/components/category/CategoryTable";

export const metadata: Metadata = {
  title: "Category | TailAdmin - Next.js Dashboard Template",
};

export default function CategoryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Offers" />
      <div className="space-y-6">
        <CategoryTable />
      </div>
    </div>
  );
}
