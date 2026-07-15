import type { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuestSubNav from "@/components/quest/QuestSubNav";
import {
  awaitPageDynamicProps,
  type DefaultAppPageProps,
} from "@/lib/nextAppPageProps";
import QuestPageClient from "../../QuestPageClient";

export const metadata: Metadata = {
  title: "Edit quest | GoGoCash Admin",
};

export function generateStaticParams() {
  return process.env.BUILD_FOR_FIREBASE === "1"
    ? [{ questId: "q_open_2026_06" }]
    : [];
}

export default async function EditQuestPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  const params = await props.params;
  const rawQuestId = params.questId;
  const questId = Array.isArray(rawQuestId)
    ? (rawQuestId[0] ?? "")
    : (rawQuestId ?? "");

  return (
    <div className="min-w-0">
      <PageBreadcrumb
        pageTitle="Edit quest"
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Quest", href: "/quest" },
          { label: "Edit quest" },
        ]}
      />
      <div className="space-y-6">
        <QuestSubNav />
        <QuestPageClient view="edit" questId={questId} />
      </div>
    </div>
  );
}
