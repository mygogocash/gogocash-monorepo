import CategoryTable from "@/components/category/CategoryTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Category | GoGoCash Admin",
};

export default async function CategoryPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Category"
        items={[
          { label: "Home", href: "/" },
          { label: "Brands Management", href: "/brands" },
          { label: "Category" },
        ]}
      />
      <div className="space-y-6">
        <CategoryTable />
      </div>
    </div>
  );
}
