import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";
import BannerTable from "@/components/banner/BannerTable";

export const metadata: Metadata = {
  title: "Category | TailAdmin - Next.js Dashboard Template",
};

/**
 * BannerPage is a page that renders a PageBreadcrumb and a CategoryTable component.
 * It is used to display a list of categories in the admin dashboard.
 *
 * @returns {JSX.Element} A JSX element representing the BannerPage.
 */
export default async function BannerPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Home Page Banner" />
      <div className="space-y-6">
        <BannerTable />
      </div>
    </div>
  );
}
