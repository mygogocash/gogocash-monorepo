import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CouponHistoryTable from "@/components/coupon/CouponHistoryTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coupon History | GoGoCash Admin",
};

export default function CouponHistoryPage() {
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
