import type { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuestSubNav from "@/components/quest/QuestSubNav";
import {
  awaitPageDynamicProps,
  type DefaultAppPageProps,
} from "@/lib/nextAppPageProps";
import QuestPageClient from "../QuestPageClient";

export const metadata: Metadata = {
  title: "Create quest | GoGoCash Admin",
};

export default async function CreateQuestPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Create quest"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Quest", href: "/quest" },
          { label: "Create quest" },
        ]}
      />
      <div className="space-y-6">
        <QuestSubNav />
        <QuestPageClient view="create" />
      </div>
    </div>
  );
}
