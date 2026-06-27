import type { QuestTaskPayload } from "@/types/quest";

export type TaskDraft = QuestTaskPayload & {
  clientId: string;
};

export function buildQuestTaskPayloads(tasks: TaskDraft[]): QuestTaskPayload[] {
  return tasks.map((task, index) => {
    const wordingEn = task.wording_en?.trim() ?? task.wording?.trim() ?? "";
    const wordingTh = task.wording_th?.trim() ?? "";
    return {
      offer: task.offer,
      offer_id: Number(task.offer_id),
      merchant_id: Number(task.merchant_id),
      extra_point: Number(task.extra_point),
      sort_order: index,
      enabled: task.enabled !== false,
      wording: wordingEn,
      wording_en: wordingEn,
      wording_th: wordingTh,
      notes: task.notes?.trim() ?? "",
    };
  });
}

export function defaultQuestTaskPoints(
  offer?: { extra_point?: number | null } | null,
  fallback = 50,
): number {
  const offerBonus = Number(offer?.extra_point ?? 0);
  // Catalog uses extra_point=1 for "no merchant bonus"; quest tasks require 2–10000.
  const candidate = offerBonus > 1 ? offerBonus : fallback;
  return Math.min(10000, Math.max(2, Math.round(candidate)));
}

export function normalizeQuestTaskPoints(
  value: number,
  offer?: { extra_point?: number | null } | null,
): number {
  const points = Number(value);
  if (Number.isInteger(points) && points >= 2 && points <= 10000) {
    return points;
  }
  return defaultQuestTaskPoints(offer);
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
      return "Each task needs 2–10,000 points (catalog extra_point of 1 means no bonus).";
    }
    if ((task.wording_en?.trim().length ?? 0) > 140) {
      return "English customer wording must be 140 characters or fewer.";
    }
    if ((task.wording_th?.trim().length ?? 0) > 140) {
      return "Thai customer wording must be 140 characters or fewer.";
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
