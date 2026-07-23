import { resolveOfferMediaUrl } from "@mobile/api/mediaUrl";
import { BRAND_LOGO_IMAGE_WIDTH } from "@mobile/api/optimizedImageUrl";
import type { Locale } from "@mobile/i18n/locales";

import type {
  QuestTaskProgressUnit,
  QuestTaskRow,
  QuestTaskType,
} from "./questTaskMapper";

export const questTaskCatalogEndpoint = "/point/quest-task-catalog";

export type QuestTaskCatalogSource =
  "canonical" | "legacy_compatibility" | "none";

type QuestTaskCatalogTarget =
  | { kind: "purchase"; required_purchases: 1 }
  | {
      kind: "referral";
      completion_rule: "account_created" | "first_earning_conversion";
    }
  | {
      kind: "spend_thb_minor";
      spend_scope: "any_shop_via_ggc";
      target_thb_minor: number;
    }
  | { kind: "quest_points_threshold"; threshold_points: number };

type QuestTaskCatalogOffer = {
  href?: string;
  id: string;
  logo_uri?: string;
  name: string;
};

type QuestTaskCatalogTask = {
  offer?: QuestTaskCatalogOffer;
  points: number;
  sort_order: number;
  target?: QuestTaskCatalogTarget;
  task_key: string;
  task_kind: QuestTaskType;
  wording_en: string;
  wording_th: string;
};

export type QuestTaskCatalogV1 = {
  catalog_source: QuestTaskCatalogSource;
  config_revision: number | null;
  contract_version: 1;
  quest_id: string | null;
  tasks: QuestTaskCatalogTask[];
};

export type MappedQuestTaskCatalog = {
  catalogSource: QuestTaskCatalogSource;
  configRevision: number | null;
  questId: string | null;
  rows: QuestTaskRow[];
};

const iconByTaskType: Record<QuestTaskType, QuestTaskRow["icon"]> = {
  brand_purchase: "go",
  friend_referral: "glow",
  points_threshold_bonus: "go",
  spend_target: "orbit",
};

export function mapQuestTaskCatalog(
  payload: unknown,
  locale: Locale = "en",
): MappedQuestTaskCatalog | null {
  const catalog = parseQuestTaskCatalog(payload);
  if (!catalog) return null;

  if (!catalog.quest_id) {
    return {
      catalogSource: catalog.catalog_source,
      configRevision: catalog.config_revision,
      questId: null,
      rows: [],
    };
  }

  const rows = catalog.tasks
    .map((task, index) => ({
      index,
      row: mapCatalogTask(catalog.quest_id!, task, locale),
      sortOrder: task.sort_order,
    }))
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.index - right.index,
    )
    .map(({ row }) => row);

  return {
    catalogSource: catalog.catalog_source,
    configRevision: catalog.config_revision,
    questId: catalog.quest_id,
    rows,
  };
}

function mapCatalogTask(
  questId: string,
  task: QuestTaskCatalogTask,
  locale: Locale,
): QuestTaskRow {
  const title =
    pickLocalizedText(task.wording_en, task.wording_th, locale) ??
    task.offer?.name ??
    task.task_key;
  const unit = unitForTask(task);
  const target = targetForTask(task);
  const logoUri = task.offer?.logo_uri
    ? resolveOfferMediaUrl(task.offer.logo_uri, undefined, {
        width: BRAND_LOGO_IMAGE_WIDTH,
      })
    : undefined;
  const href = safeShopHref(task.offer);

  return {
    current: 0,
    ...(href ? { href } : {}),
    icon: iconByTaskType[task.task_kind],
    key: `${questId}:${task.task_key}`,
    ...(logoUri ? { logoUri } : {}),
    points: `+${Math.trunc(task.points)} Points`,
    progressLabel: "",
    questId,
    state: "not_started",
    stateLabel: "",
    target,
    taskKey: task.task_key,
    taskType: task.task_kind,
    title,
    unit,
  };
}

function unitForTask(task: QuestTaskCatalogTask): QuestTaskProgressUnit {
  if (task.task_kind === "friend_referral") return "referral";
  if (task.task_kind === "spend_target") return "thb_minor";
  if (task.task_kind === "points_threshold_bonus") return "quest_points";
  return "purchase";
}

function targetForTask(task: QuestTaskCatalogTask): number | null {
  if (!task.target) return task.task_kind === "brand_purchase" ? 1 : null;
  if (task.target.kind === "purchase") return task.target.required_purchases;
  if (task.target.kind === "spend_thb_minor") {
    return task.target.target_thb_minor;
  }
  if (task.target.kind === "quest_points_threshold") {
    return task.target.threshold_points;
  }
  return null;
}

function safeShopHref(offer: QuestTaskCatalogOffer | undefined) {
  const href = offer?.href?.trim();
  if (href && /^\/shop(?:\/[A-Za-z0-9._~-]+)?$/.test(href)) return href;
  return offer?.id ? `/shop/${encodeURIComponent(offer.id)}` : undefined;
}

function parseQuestTaskCatalog(payload: unknown): QuestTaskCatalogV1 | null {
  if (!isRecord(payload)) return null;
  if (payload.contract_version !== 1) return null;
  if (!isNullableText(payload.quest_id)) return null;
  if (!isNullableRevision(payload.config_revision)) return null;
  if (!isCatalogSource(payload.catalog_source)) return null;
  if (!Array.isArray(payload.tasks)) return null;
  if (
    (payload.quest_id === null &&
      (payload.catalog_source !== "none" ||
        payload.config_revision !== null ||
        payload.tasks.length > 0)) ||
    (payload.quest_id !== null &&
      payload.config_revision === null) ||
    (payload.catalog_source === "none" && payload.tasks.length > 0)
  ) {
    return null;
  }

  const tasks = payload.tasks.map(parseCatalogTask);
  if (tasks.some((task) => task === null)) return null;

  return {
    catalog_source: payload.catalog_source,
    config_revision: payload.config_revision,
    contract_version: 1,
    quest_id: payload.quest_id,
    tasks: tasks as QuestTaskCatalogTask[],
  };
}

function parseCatalogTask(raw: unknown): QuestTaskCatalogTask | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyText(raw.task_key)) return null;
  if (!isTaskType(raw.task_kind)) return null;
  if (!isNonNegativeNumber(raw.points)) return null;
  if (!isNonNegativeInteger(raw.sort_order)) return null;
  if (typeof raw.wording_en !== "string") return null;
  if (typeof raw.wording_th !== "string") return null;

  const offer = raw.offer === undefined ? undefined : parseOffer(raw.offer);
  if (raw.offer !== undefined && !offer) return null;
  const target = raw.target === undefined ? undefined : parseTarget(raw.target);
  if (target === null) return null;
  if (!targetMatchesTask(raw.task_kind, target)) return null;

  return {
    ...(offer ? { offer } : {}),
    points: raw.points,
    sort_order: raw.sort_order,
    ...(target ? { target } : {}),
    task_key: raw.task_key.trim(),
    task_kind: raw.task_kind,
    wording_en: raw.wording_en.trim(),
    wording_th: raw.wording_th.trim(),
  };
}

function targetMatchesTask(
  taskKind: QuestTaskType,
  target: QuestTaskCatalogTarget | undefined,
) {
  if (taskKind === "brand_purchase") {
    return target === undefined || target.kind === "purchase";
  }
  if (taskKind === "friend_referral") return target?.kind === "referral";
  if (taskKind === "spend_target") return target?.kind === "spend_thb_minor";
  return target?.kind === "quest_points_threshold";
}

function parseOffer(raw: unknown): QuestTaskCatalogOffer | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyText(raw.id) || !isNonEmptyText(raw.name)) return null;
  if (raw.logo_uri !== undefined && typeof raw.logo_uri !== "string")
    return null;
  if (raw.href !== undefined && typeof raw.href !== "string") return null;
  return {
    ...(typeof raw.href === "string" ? { href: raw.href } : {}),
    id: raw.id.trim(),
    ...(typeof raw.logo_uri === "string" ? { logo_uri: raw.logo_uri } : {}),
    name: raw.name.trim(),
  };
}

function parseTarget(raw: unknown): QuestTaskCatalogTarget | null {
  if (!isRecord(raw)) return null;
  if (raw.kind === "purchase") {
    return raw.required_purchases === 1
      ? { kind: "purchase", required_purchases: 1 }
      : null;
  }
  if (raw.kind === "referral") {
    return raw.completion_rule === "account_created" ||
      raw.completion_rule === "first_earning_conversion"
      ? { kind: "referral", completion_rule: raw.completion_rule }
      : null;
  }
  if (raw.kind === "spend_thb_minor") {
    return raw.spend_scope === "any_shop_via_ggc" &&
      isNonNegativeNumber(raw.target_thb_minor)
      ? {
          kind: "spend_thb_minor",
          spend_scope: "any_shop_via_ggc",
          target_thb_minor: raw.target_thb_minor,
        }
      : null;
  }
  if (
    raw.kind === "quest_points_threshold" &&
    isNonNegativeNumber(raw.threshold_points)
  ) {
    return {
      kind: "quest_points_threshold",
      threshold_points: raw.threshold_points,
    };
  }
  return null;
}

function pickLocalizedText(
  wordingEn: string,
  wordingTh: string,
  locale: Locale,
) {
  const primary = locale === "th" ? wordingTh : wordingEn;
  const secondary = locale === "th" ? wordingEn : wordingTh;
  return primary || secondary || undefined;
}

function isCatalogSource(value: unknown): value is QuestTaskCatalogSource {
  return (
    value === "canonical" ||
    value === "legacy_compatibility" ||
    value === "none"
  );
}

function isTaskType(value: unknown): value is QuestTaskType {
  return (
    value === "brand_purchase" ||
    value === "friend_referral" ||
    value === "spend_target" ||
    value === "points_threshold_bonus"
  );
}

function isNullableText(value: unknown): value is string | null {
  return value === null || isNonEmptyText(value);
}

function isNullableRevision(value: unknown): value is number | null {
  return value === null || isNonNegativeInteger(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
