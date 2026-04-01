import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";
import QuestPageClient from "./QuestPageClient";

export const metadata: Metadata = {
  title: "Quest | GoGoCash Admin",
};

export default async function QuestPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Quest"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Quest Home" },
          { label: "Quest Lists" },
        ]}
      />
      <div className="space-y-6">
        <QuestPageClient />
      </div>
    </div>
  );
}
