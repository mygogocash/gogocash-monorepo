import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import WithdrawDetail from "@/components/withdraw/WithdrawDetail";

export default function WithdrawPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Detail" />
      <div className="space-y-6">
        <WithdrawDetail />
      </div>
    </div>
  );
}
