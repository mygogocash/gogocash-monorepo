import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuestSubNav from "@/components/quest/QuestSubNav";
import CreateRewardForm from "@/components/reward/CreateRewardForm";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Create Reward | GoGoCash Admin",
};

export default async function RewardPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
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
        <QuestSubNav />
        <CreateRewardForm />
      </div>
    </div>
  );
}
