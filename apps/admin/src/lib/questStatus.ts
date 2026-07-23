export const QUEST_STATUS_VALUES = ["open", "close", "scheduled"] as const;

export type QuestStatus = (typeof QUEST_STATUS_VALUES)[number];

/** Derive campaign state exclusively from its start/end window. */
export function deriveQuestStatus(
  startDate: Date | string,
  endDate: Date | string,
  now = new Date(),
): QuestStatus {
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  const nowTime = now.getTime();

  if (Number.isFinite(startTime) && nowTime < startTime) return "scheduled";
  if (Number.isFinite(endTime) && nowTime > endTime) return "close";
  return "open";
}

export function questStatusLabel(status: string): string {
  if (status === "open") return "Active";
  if (status === "close" || status === "closed") return "Closed";
  if (status === "scheduled") return "Scheduled";
  return status;
}

export function questStatusBadgeColor(
  status: string,
): "success" | "warning" | "info" {
  if (status === "open") return "success";
  if (status === "scheduled") return "info";
  return "warning";
}
