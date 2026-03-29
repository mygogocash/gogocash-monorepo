import CategoryTable from "@/components/category/CategoryTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Category | GoGoCash Admin",
};

export default function CategoryPage() {
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Category"
        items={[
          { label: "Home", href: "/" },
          { label: "Offers Management", href: "/offers" },
          { label: "Category" },
        ]}
      />
      <div className="space-y-6">
        <CategoryTable />
      </div>
    </div>
  );
}
