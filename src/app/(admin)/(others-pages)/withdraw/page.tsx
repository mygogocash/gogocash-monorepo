import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";
import WithdrawTable from "@/components/withdraw/WithdrawTable";

export const metadata: Metadata = {
  title: "Offers | TailAdmin - Next.js Dashboard Template",
};

export default async function WithdrawPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb pageTitle="Withdraw" />
      <div className="space-y-6">
        <WithdrawTable />
      </div>
    </div>
  );
}
