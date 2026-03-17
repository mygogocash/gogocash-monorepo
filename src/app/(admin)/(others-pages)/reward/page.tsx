import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CreateRewardForm from "@/components/reward/CreateRewardForm";

export const metadata: Metadata = {
  title: "Create Reward | GoGoCash Admin",
};

export default function RewardPage() {
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Create Reward"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Create Reward" },
        ]}
      />
      <div className="space-y-6">
        <CreateRewardForm />
      </div>
    </div>
  );
}
