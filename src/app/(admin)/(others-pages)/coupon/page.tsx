import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import CouponTable from "@/components/coupon/CouponTable";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Coupon | TailAdmin - Next.js Dashboard Template",
};

export default async function CouponPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Coupon" />
      <div className="space-y-6">
        <CouponTable />
      </div>
    </div>
  );
}
