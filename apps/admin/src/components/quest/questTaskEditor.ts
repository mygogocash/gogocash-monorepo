import type { QuestTaskPayload, QuestTaskType } from "@/types/quest";

export type TaskDraft = {
  clientId: string;
  task_key?: string;
  task_type: QuestTaskType | null;
  points: number;
  sort_order?: number;
  enabled: boolean;
  wording?: string;
  wording_en?: string;
  wording_th?: string;
  notes?: string;
  offer?: string;
  offer_id?: number;
  merchant_id?: number;
  completion_rule?: "account_created" | "first_earning_conversion";
  spend_scope?: "any_shop_via_ggc";
  target_thb_minor?: number;
};

export function buildQuestTaskPayloads(tasks: TaskDraft[]): QuestTaskPayload[] {
  return tasks.map((task) => {
    if (!task.task_type) {
      throw new Error("Choose a task type before saving.");
    }
    const wordingEn = task.wording_en?.trim() ?? task.wording?.trim() ?? "";
    const wordingTh = task.wording_th?.trim() ?? "";
    const common = {
      ...(task.task_key ? { task_key: task.task_key } : {}),
      task_type: task.task_type,
      points: Number(task.points),
      enabled: task.enabled !== false,
      wording: wordingEn,
      wording_en: wordingEn,
      wording_th: wordingTh,
      notes: task.notes?.trim() ?? "",
    };

    if (task.task_type === "brand_purchase") {
      return {
        ...common,
        task_type: "brand_purchase",
        offer: task.offer ?? "",
      };
    }
    if (task.task_type === "friend_referral") {
      return {
        ...common,
        task_type: "friend_referral",
        completion_rule: task.completion_rule ?? "account_created",
      };
    }
    return {
      ...common,
      task_type: "spend_target",
      spend_scope: "any_shop_via_ggc",
      target_thb_minor: Number(task.target_thb_minor),
    };
  });
}

export function switchQuestTaskType(
  task: TaskDraft,
  taskType: QuestTaskType,
): TaskDraft {
  const common: TaskDraft = {
    clientId: task.clientId,
    task_type: taskType,
    points: Number(task.points || 50),
    sort_order: task.sort_order,
    enabled: task.enabled !== false,
    wording: task.wording,
    wording_en: task.wording_en ?? "",
    wording_th: task.wording_th ?? "",
    notes: task.notes ?? "",
  };
  if (taskType === "brand_purchase") return { ...common, offer: "" };
  if (taskType === "friend_referral") {
    return { ...common, completion_rule: "account_created" };
  }
  return {
    ...common,
    spend_scope: "any_shop_via_ggc",
    target_thb_minor: 100_000,
  };
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
    if (!task.task_type) return "Choose a task type for every task.";
    if (
      !Number.isInteger(Number(task.points)) ||
      Number(task.points) < 2 ||
      Number(task.points) > 10000
    ) {
      return "Each task needs 2–10,000 points.";
    }
    if (task.task_type === "brand_purchase") {
      if (!task.offer) return "Every push-on-brand task needs a brand.";
      if (seen.has(task.offer)) return "A brand can only appear once.";
      seen.add(task.offer);
    }
    if (
      task.task_type === "friend_referral" &&
      task.completion_rule !== "account_created" &&
      task.completion_rule !== "first_earning_conversion"
    ) {
      return "Choose when the friend referral is complete.";
    }
    if (
      task.task_type === "spend_target" &&
      (!Number.isSafeInteger(Number(task.target_thb_minor)) ||
        Number(task.target_thb_minor) < 1)
    ) {
      return "Reach-spend tasks need a positive spend target.";
    }
    if (
      !task.wording?.trim() &&
      !task.wording_en?.trim() &&
      !task.wording_th?.trim()
    ) {
      return "Each task needs English or Thai customer wording.";
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
