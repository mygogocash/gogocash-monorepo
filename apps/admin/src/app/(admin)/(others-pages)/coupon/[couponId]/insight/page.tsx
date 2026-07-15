import { Metadata } from "next";

import { mockCoupons } from "@/app/api/mock/data";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CouponHistoryTable from "@/components/coupon/CouponHistoryTable";
import type { DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Coupon Insight | GoGoCash Admin",
};

export function generateStaticParams() {
  if (process.env.BUILD_FOR_FIREBASE !== "1") return [];
  return mockCoupons.map((coupon) => ({ couponId: coupon._id }));
}

export default async function CouponInsightPage(props: DefaultAppPageProps) {
  const params = await props.params;
  const rawCouponId = params.couponId;
  const couponId = Array.isArray(rawCouponId)
    ? (rawCouponId[0] ?? "")
    : (rawCouponId ?? "");

  return (
    <div className="min-w-0">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: "Home" },
          { href: "/coupon", label: "Coupon History" },
          { label: "Insight" },
        ]}
        pageTitle="Coupon Insight"
      />
      <CouponHistoryTable couponId={couponId} />
    </div>
  );
}
