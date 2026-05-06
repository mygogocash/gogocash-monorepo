import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuestSubNav from "@/components/quest/QuestSubNav";
import CreatePointsForm from "@/components/points/CreatePointsForm";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";

export const metadata: Metadata = {
  title: "Create Points | GoGoCash Admin",
};

export default async function PointsPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Create Points"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Create Points" },
        ]}
      />
      <div className="space-y-6">
        <QuestSubNav />
        <CreatePointsForm />
      </div>
    </div>
  );
}
