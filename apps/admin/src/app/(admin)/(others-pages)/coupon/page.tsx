import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CouponTable from "@/components/coupon/CouponTable";
import { Metadata } from "next";
import {
  awaitPageDynamicProps,
  type DefaultAppPageProps,
} from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Coupon History | GoGoCash Admin",
};

export default async function CouponPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Coupon History" />
      <CouponTable />
    </div>
  );
}
