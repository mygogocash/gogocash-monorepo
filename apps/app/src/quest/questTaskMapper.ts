import type { Locale } from "@mobile/i18n/locales";
import { resolveOfferMediaUrl } from "@mobile/api/mediaUrl";
import { BRAND_LOGO_IMAGE_WIDTH } from "@mobile/api/optimizedImageUrl";

export const questTaskEndpoint = "/point/quest-progress";

export type QuestTaskIcon = "go" | "glow" | "orbit" | "pixel" | "watchAds";
export type QuestTaskProgressState =
  "not_started" | "in_progress" | "completed" | "compensated";
export type QuestTaskType =
  | "brand_purchase"
  | "friend_referral"
  | "spend_target"
  | "points_threshold_bonus";
type CanonicalQuestTaskType = Exclude<QuestTaskType, "points_threshold_bonus">;
export type QuestTaskProgressUnit =
  "purchase" | "referral" | "thb_minor" | "quest_points";

export type QuestTaskRow = {
  capLabel?: string;
  capReached?: boolean;
  capReason?: "max_awards_per_user" | "max_referrals_per_user";
  current: number;
  href?: string;
  icon: QuestTaskIcon;
  key: string;
  logoUri?: string;
  points: string;
  progressLabel: string;
  questId?: string;
  state: QuestTaskProgressState;
  stateLabel: string;
  target: number | null;
  taskKey?: string;
  taskType: QuestTaskType;
  title: string;
  unit: QuestTaskProgressUnit;
};

type CanonicalQuestProgress = {
  quest_id?: unknown;
  tasks?: unknown;
};

type CanonicalQuestTask = {
  offer?: unknown;
  points?: unknown;
  progress?: unknown;
  task_key?: unknown;
  task_type?: unknown;
  wording_en?: unknown;
  wording_th?: unknown;
};

type CanonicalTaskProgress = {
  cap_reached?: unknown;
  cap_reason?: unknown;
  current?: unknown;
  state?: unknown;
  target?: unknown;
  unit?: unknown;
};

const taskIconByType: Record<CanonicalQuestTaskType, QuestTaskIcon> = {
  brand_purchase: "go",
  friend_referral: "glow",
  spend_target: "orbit",
};

export function mapBackendQuestTasks(
  payload: unknown,
  fallbackRows: QuestTaskRow[] = [],
  locale: Locale = "en",
): QuestTaskRow[] {
  const quests = unwrapQuestProgress(payload);
  if (!quests) return fallbackRows;

  return quests.flatMap((quest) => mapQuestProgress(quest, locale));
}

function unwrapQuestProgress(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data;
  return null;
}

function mapQuestProgress(raw: unknown, locale: Locale): QuestTaskRow[] {
  if (!isRecord(raw)) return [];
  const quest = raw as CanonicalQuestProgress;
  const questId = firstText(quest.quest_id);
  if (!questId || !Array.isArray(quest.tasks)) return [];

  return quest.tasks
    .map((task) => mapQuestTask(questId, task, locale))
    .filter((task): task is QuestTaskRow => task !== null);
}

function mapQuestTask(
  questId: string,
  raw: unknown,
  locale: Locale,
): QuestTaskRow | null {
  if (!isRecord(raw)) return null;
  const task = raw as CanonicalQuestTask;
  const taskKey = firstText(task.task_key);
  const taskType = parseTaskType(task.task_type);
  const points = toFiniteNumber(task.points);
  const title = pickLocalizedText(task.wording_en, task.wording_th, locale);
  if (!taskKey || !taskType || points == null || !title) return null;
  if (!isRecord(task.progress)) return null;

  const progress = task.progress as CanonicalTaskProgress;
  const state = parseProgressState(progress.state);
  const unit = parseProgressUnit(progress.unit);
  const current = toFiniteNumber(progress.current);
  const target =
    progress.target == null ? null : toFiniteNumber(progress.target);
  const capReached = progress.cap_reached === true;
  const capReason = parseCapReason(progress.cap_reason);
  if (
    !state ||
    !unit ||
    current == null ||
    (progress.target != null && target == null)
  ) {
    return null;
  }

  const offerId =
    taskType === "brand_purchase" && isRecord(task.offer)
      ? firstText(task.offer.id)
      : undefined;
  const logoUri =
    taskType === "brand_purchase" && isRecord(task.offer)
      ? resolveOfferMediaUrl(firstText(task.offer.logo_url), undefined, {
          width: BRAND_LOGO_IMAGE_WIDTH,
        })
      : undefined;

  return {
    ...(capReached
      ? {
          capLabel:
            locale === "th" ? "ถึงขีดจำกัดรางวัลแล้ว" : "Reward limit reached",
          capReached: true,
          ...(capReason ? { capReason } : {}),
        }
      : {}),
    current,
    ...(offerId ? { href: `/shop/${encodeURIComponent(offerId)}` } : {}),
    icon: taskIconByType[taskType],
    key: `${questId}:${taskKey}`,
    ...(logoUri ? { logoUri } : {}),
    points: formatQuestPoints(points),
    progressLabel: formatProgress(current, target, unit, locale),
    questId,
    state,
    stateLabel: progressStateLabel(state, locale),
    target,
    taskKey,
    taskType,
    title,
    unit,
  };
}

function parseCapReason(
  value: unknown,
): "max_awards_per_user" | "max_referrals_per_user" | null {
  return value === "max_awards_per_user" || value === "max_referrals_per_user"
    ? value
    : null;
}

function pickLocalizedText(
  wordingEn: unknown,
  wordingTh: unknown,
  locale: Locale,
): string | undefined {
  return locale === "th"
    ? firstText(wordingTh, wordingEn)
    : firstText(wordingEn, wordingTh);
}

function formatProgress(
  current: number,
  target: number | null,
  unit: QuestTaskProgressUnit,
  locale: Locale,
): string {
  if (unit === "thb_minor") {
    const currentThb = formatNumber(current / 100, locale);
    const targetThb =
      target == null ? noCapLabel(locale) : formatNumber(target / 100, locale);
    return locale === "th"
      ? `${currentThb} บาท / ${targetThb}${target == null ? "" : " บาท"}`
      : `THB ${currentThb} / ${target == null ? "" : "THB "}${targetThb}`;
  }

  const targetText =
    target == null ? noCapLabel(locale) : formatNumber(target, locale);
  if (locale === "th") {
    return `${formatNumber(current, locale)} / ${targetText} ${
      unit === "purchase" ? "รายการซื้อ" : "คนที่แนะนำ"
    }`;
  }
  const noun =
    unit === "purchase"
      ? target === 1
        ? "purchase"
        : "purchases"
      : target === 1
        ? "referral"
        : "referrals";
  return `${formatNumber(current, locale)} / ${targetText} ${noun}`;
}

function progressStateLabel(
  state: QuestTaskProgressState,
  locale: Locale,
): string {
  const labels =
    locale === "th"
      ? {
          not_started: "ยังไม่เริ่ม",
          in_progress: "กำลังดำเนินการ",
          completed: "สำเร็จแล้ว",
          compensated: "ย้อนรายการแล้ว",
        }
      : {
          not_started: "Not started",
          in_progress: "In progress",
          completed: "Completed",
          compensated: "Reversed",
        };
  return labels[state];
}

function noCapLabel(locale: Locale): string {
  return locale === "th" ? "ไม่จำกัด" : "No cap";
}

function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuestPoints(value: number): string {
  return `+${Math.trunc(value)} Points`;
}

function parseTaskType(value: unknown): CanonicalQuestTaskType | null {
  return value === "brand_purchase" ||
    value === "friend_referral" ||
    value === "spend_target"
    ? value
    : null;
}

function parseProgressState(value: unknown): QuestTaskProgressState | null {
  return value === "not_started" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "compensated"
    ? value
    : null;
}

function parseProgressUnit(value: unknown): QuestTaskProgressUnit | null {
  return value === "purchase" || value === "referral" || value === "thb_minor"
    ? value
    : null;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
