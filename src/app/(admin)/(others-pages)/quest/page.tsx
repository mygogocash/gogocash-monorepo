import { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuestPageClient from "./QuestPageClient";

export const metadata: Metadata = {
  title: "Quest | GoGoCash Admin",
};

export default function QuestPage() {
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
