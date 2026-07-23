// Maps the PUBLIC GoGoQuest earn-list onto the QuestTaskRow shape the screen already renders.
// Pure functions, no I/O — mirrors questTaskMapper / questRankMapper.
//
// Endpoint (verified live on api-beta 2026-07-22, no auth):
//   GET /offer/extra-point -> array of Offer docs, each with an extra_point bonus.
// This is exactly what prod app.gogocash.co renders as "Let's Got the Tasks Done!" for everyone,
// signed in or not. Prod ALSO renders one hardcoded frontend row (not from the API) for the
// "spend 300 THB on any shop" bonus — replicated here as HARDCODED_SHOP_300_TASK.
import { resolveOfferMediaUrl } from "@mobile/api/mediaUrl";
import { BRAND_LOGO_IMAGE_WIDTH } from "@mobile/api/optimizedImageUrl";
import type { Locale } from "@mobile/i18n/locales";

import type { QuestTaskRow } from "./questTaskMapper";

export const extraPointEndpoint = "/offer/extra-point";

// Prod parity: a single hardcoded earn row alongside the API brands. Title is an English literal
// so tc(task.title) localizes it at render time (like every other QuestTaskRow title).
export const HARDCODED_SHOP_300_TASK: QuestTaskRow = {
  current: 0,
  href: "/shop",
  icon: "go",
  key: "extra-point:shop-300",
  points: "+50 Points",
  progressLabel: "",
  state: "not_started",
  stateLabel: "",
  target: 1,
  taskType: "brand_purchase",
  title: "Shop 300 Baht+ on any shops",
  unit: "purchase",
};

export function mapPublicBrandTasks(
  payload: unknown,
  locale: Locale = "en",
): QuestTaskRow[] {
  const offers = unwrap(payload);
  if (!offers) return [];
  return offers
    .map((raw) => mapOffer(raw, locale))
    .filter((row): row is QuestTaskRow => row !== null);
}

function unwrap(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data;
  return null;
}

function mapOffer(raw: unknown, locale: Locale): QuestTaskRow | null {
  if (!isRecord(raw)) return null;
  const offerId = firstText(raw._id, raw.id);
  const title =
    pickLocalizedText(raw.quest_task_wording_en, raw.quest_task_wording_th, locale) ??
    firstText(raw.offer_name_display, raw.offer_name);
  if (!offerId || !title) return null;

  const extraPoint = toFiniteNumber(raw.extra_point) ?? 0;
  const logoUri = resolveOfferMediaUrl(
    firstText(raw.logo_circle, raw.logo, raw.logo_mobile, raw.logo_desktop),
    undefined,
    { width: BRAND_LOGO_IMAGE_WIDTH },
  );

  return {
    current: 0,
    href: `/shop/${encodeURIComponent(offerId)}`,
    icon: "go",
    key: `extra-point:${offerId}`,
    ...(logoUri ? { logoUri } : {}),
    points: `+${Math.trunc(extraPoint)} Points`,
    // The public earn-list is a catalog, not per-user progress — no progress/state chrome.
    progressLabel: "",
    state: "not_started",
    stateLabel: "",
    target: 1,
    taskType: "brand_purchase",
    title,
    unit: "purchase",
  };
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

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
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
