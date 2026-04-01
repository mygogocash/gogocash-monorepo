import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CouponHistoryTable from "@/components/coupon/CouponHistoryTable";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Coupon History | GoGoCash Admin",
};

export default async function CouponHistoryPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Coupon History"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Coupon", href: "/coupon" },
          { label: "Coupon History" },
        ]}
      />
      <div className="space-y-6">
        <CouponHistoryTable />
      </div>
    </div>
  );
}
