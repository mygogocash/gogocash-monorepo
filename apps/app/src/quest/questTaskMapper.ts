import type { Locale } from "@mobile/i18n/locales";

export const questTaskEndpoint = "/offer/extra-point";

export type QuestTaskIcon = "go" | "glow" | "orbit" | "pixel" | "watchAds";

export type QuestTaskRow = {
  href?: string;
  icon: QuestTaskIcon;
  key: string;
  logoUri?: string;
  points: string;
  title: string;
};

type BackendQuestTaskOffer = {
  _id?: unknown;
  disabled?: unknown;
  extra_point?: unknown;
  logo?: unknown;
  logo_circle?: unknown;
  offer_id?: unknown;
  offer_name?: unknown;
  offer_name_display?: unknown;
  quest_task_sort_order?: unknown;
  quest_task_wording?: unknown;
  quest_task_wording_en?: unknown;
  quest_task_wording_th?: unknown;
  status?: unknown;
};

export function mapBackendQuestTasks(
  payload: unknown,
  fallbackRows: QuestTaskRow[] = [],
  locale: Locale = "en",
): QuestTaskRow[] {
  if (!Array.isArray(payload)) {
    return fallbackRows;
  }

  const rows = payload
    .map((raw, index) => mapBackendQuestTask(raw, index, locale))
    .filter((row): row is QuestTaskRow & { sortOrder: number } => row !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _sortOrder, ...row }) => row);

  return rows;
}

function mapBackendQuestTask(
  raw: unknown,
  index: number,
  locale: Locale,
): (QuestTaskRow & { sortOrder: number }) | null {
  if (!isRecord(raw)) {
    return null;
  }

  const task = raw as BackendQuestTaskOffer;
  if (task.disabled === true || task.status === "pending_review" || task.status === "rejected") {
    return null;
  }

  const title = pickQuestTaskTitle(task, locale);
  if (!title) {
    return null;
  }

  const key = firstText(task._id, task.offer_id) ?? `quest-task-${index}`;
  const offerPathId = firstText(task._id, task.offer_id);
  const logoUri = firstText(task.logo_circle, task.logo);

  return {
    href: offerPathId ? `/shop/${encodeURIComponent(offerPathId)}` : undefined,
    icon: "go",
    key,
    logoUri,
    points: formatQuestPoints(task.extra_point),
    sortOrder: toFiniteNumber(task.quest_task_sort_order) ?? index,
    title,
  };
}

function pickQuestTaskTitle(task: BackendQuestTaskOffer, locale: Locale): string | undefined {
  const en = firstText(task.quest_task_wording_en, task.quest_task_wording);
  const th = firstText(task.quest_task_wording_th);
  if (locale === "th") {
    return firstText(th, en, task.offer_name_display, task.offer_name);
  }
  return firstText(en, th, task.offer_name_display, task.offer_name);
}

function formatQuestPoints(value: unknown): string {
  const points = toFiniteNumber(value);
  return `+${points == null ? 0 : Math.trunc(points)} Points`;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
