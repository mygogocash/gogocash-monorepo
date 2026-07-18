import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import WithdrawFeeCouponTable from "@/components/coupon/WithdrawFeeCouponTable";
import { Metadata } from "next";
import {
  awaitPageDynamicProps,
  type DefaultAppPageProps,
} from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Withdraw Fee Coupons | GoGoCash Admin",
};

export default async function WithdrawFeeCouponPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Withdraw Fee Coupons" />
      <WithdrawFeeCouponTable />
    </div>
  );
}
