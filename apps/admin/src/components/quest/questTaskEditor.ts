import type { QuestTaskPayload } from "@/types/quest";

export type TaskDraft = QuestTaskPayload & {
  clientId: string;
};

export function buildQuestTaskPayloads(tasks: TaskDraft[]): QuestTaskPayload[] {
  return tasks.map((task, index) => ({
    offer: task.offer,
    offer_id: Number(task.offer_id),
    merchant_id: Number(task.merchant_id),
    extra_point: Number(task.extra_point),
    sort_order: index,
    enabled: task.enabled !== false,
    wording: task.wording?.trim() ?? "",
    notes: task.notes?.trim() ?? "",
  }));
}

export function validateQuestTasks(tasks: TaskDraft[]): string | null {
  const seen = new Set<string>();
  for (const task of tasks) {
    if (!task.offer) return "Every task needs a brand.";
    if (seen.has(task.offer)) return "A brand can only appear once.";
    seen.add(task.offer);
    if (
      !Number.isInteger(Number(task.extra_point)) ||
      Number(task.extra_point) < 2 ||
      Number(task.extra_point) > 10000
    ) {
      return "Points must be an integer between 2 and 10,000.";
    }
    if ((task.wording?.trim().length ?? 0) > 140) {
      return "Customer wording must be 140 characters or fewer.";
    }
  }
  return null;
}

export function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
