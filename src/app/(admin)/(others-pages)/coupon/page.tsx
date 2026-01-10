import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import CouponTable from "@/components/coupon/CouponTable";

export const metadata: Metadata = {
  title: "Coupon | TailAdmin - Next.js Dashboard Template",
  description: "Browse and manage coupons",
};

export default function CouponPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Coupon" />
      <div className="space-y-6">
        <CouponTable />
      </div>
    </div>
  );
}
