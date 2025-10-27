import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import WithdrawTable from "@/components/withdraw/WithdrawTable";

export const metadata: Metadata = {
  title: "Offers | TailAdmin - Next.js Dashboard Template",
  description: "Browse and manage offers",
};

export default function WithdrawPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Withdraw" />
      <div className="space-y-6">
        <WithdrawTable />
      </div>
    </div>
  );
}
