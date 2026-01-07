import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import BannerTable from "@/components/banner/BannerTable";

export const metadata: Metadata = {
  title: "Category | TailAdmin - Next.js Dashboard Template",
  description: "Browse and manage categories",
};

/**
 * BannerPage is a page that renders a PageBreadcrumb and a CategoryTable component.
 * It is used to display a list of categories in the admin dashboard.
 *
 * @returns {JSX.Element} A JSX element representing the BannerPage.
 */
export default function BannerPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Banner" />
      <div className="space-y-6">
        <BannerTable />
      </div>
    </div>
  );
}
