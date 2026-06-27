import { getOfferDisplayName } from "@/lib/offerDisplay";
import type { Offer } from "@/types/api";

export type QuestWordingLocale = "en" | "th";

export const QUEST_TASK_WORDING_TEMPLATES: ReadonlyArray<{
  en: string;
  th: string;
}> = [
  { en: "Make an order on {brand}", th: "สั่งซื้อที่ {brand}" },
  { en: "Shop at {brand}", th: "ช้อปที่ {brand}" },
  { en: "Complete a purchase on {brand}", th: "ทำการซื้อที่ {brand}" },
];

type OfferLike = Pick<Offer, "offer_name" | "offer_name_display"> | null | undefined;

export function expandQuestWordingTemplate(
  template: string,
  brandLabel: string,
): string {
  return template.replace(/\{brand\}/g, brandLabel).trim();
}

export function defaultQuestTaskWording(
  offer: OfferLike,
  locale: QuestWordingLocale,
): string {
  const brand = getOfferDisplayName(offer);
  if (!brand || brand === "—") return "";
  const template =
    locale === "th"
      ? QUEST_TASK_WORDING_TEMPLATES[0].th
      : QUEST_TASK_WORDING_TEMPLATES[0].en;
  return expandQuestWordingTemplate(template, brand);
}

export function buildQuestWordingOptions(
  locale: QuestWordingLocale,
  brandLabel: string,
): string[] {
  const options = new Set<string>();
  for (const pair of QUEST_TASK_WORDING_TEMPLATES) {
    const template = locale === "th" ? pair.th : pair.en;
    options.add(expandQuestWordingTemplate(template, brandLabel));
  }
  return Array.from(options);
}

export function filterQuestWordingOptions(
  options: string[],
  input: string,
): string[] {
  const query = input.trim().toLowerCase();
  if (!query) return options;
  return options.filter((option) => option.toLowerCase().includes(query));
}

export type QuestTaskWordingFields = {
  wording?: string;
  wording_en?: string;
  wording_th?: string;
};

export function resolveQuestTaskWording(
  task: QuestTaskWordingFields,
  offer: OfferLike,
  locale: QuestWordingLocale,
): string {
  const en = task.wording_en?.trim() || task.wording?.trim() || "";
  const th = task.wording_th?.trim() || "";
  const fallback = defaultQuestTaskWording(offer, locale);
  if (locale === "th") return th || en || fallback;
  return en || th || fallback;
}

export function normalizeQuestTaskWordingDraft(
  task: QuestTaskWordingFields,
): { wording_en: string; wording_th: string } {
  const legacy = task.wording?.trim() ?? "";
  return {
    wording_en: task.wording_en?.trim() ?? legacy,
    wording_th: task.wording_th?.trim() ?? "",
  };
}

export function shouldReplaceQuestWording(
  current: string | undefined,
  previousDefault: string,
): boolean {
  const value = current?.trim() ?? "";
  return !value || value === previousDefault;
}
