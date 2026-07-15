"use client";

import dynamic from "next/dynamic";
import type { QuestTableView } from "@/components/quest/QuestTable";

const QuestTable = dynamic(() => import("@/components/quest/QuestTable"), {
  loading: () => (
    <div className="h-96 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
  ),
});

export default function QuestPageClient({
  view = "list",
  questId,
}: {
  view?: QuestTableView;
  questId?: string;
}) {
  return <QuestTable view={view} questId={questId} />;
}
