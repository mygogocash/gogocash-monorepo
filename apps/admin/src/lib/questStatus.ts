export const QUEST_STATUS_VALUES = ["open", "close", "scheduled"] as const;

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
