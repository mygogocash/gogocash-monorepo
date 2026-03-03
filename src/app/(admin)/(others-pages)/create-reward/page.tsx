import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CreateReward from "@/components/coupon/CreateReward";

export default function CreateRewardPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Create Reward" />
      <div className="space-y-6">
        <CreateReward />
      </div>
    </div>
  );
}
