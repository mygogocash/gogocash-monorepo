import { getOfferDisplayName, type OfferLike } from "@/lib/offerDisplay";

export type QuestWordingLocale = "en" | "th";

export const QUEST_TASK_WORDING_TEMPLATES: ReadonlyArray<{
  en: string;
  th: string;
}> = [
  { en: "Make an order on {brand}", th: "สั่งซื้อที่ {brand}" },
  { en: "Shop at {brand}", th: "ช้อปที่ {brand}" },
  { en: "Complete a purchase on {brand}", th: "ทำการซื้อที่ {brand}" },
];

export function expandQuestWordingTemplate(
  template: string,
  brandLabel: string,
): string {
  return template.replace(/\{brand\}/g, brandLabel).trim();
}

export function defaultQuestTaskWording(
  offer: OfferLike | null | undefined,
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

// Editor helper copy under the wording fields. Only brand_purchase tasks (whose offer has a
// resolvable default) may truly be left blank — the save path fills the brand default. For
// tasks with no brand fallback, blank would drop the task from the customer page, so the copy
// must say wording is required rather than making a false "leave blank" promise.
export function questWordingHelperText(
  offer: OfferLike | null | undefined,
): string {
  const base =
    "Shown on the customer Quest page by language. Search presets or type custom copy. ";
  return defaultQuestTaskWording(offer, "en")
    ? `${base}Leave blank to use the brand default for that language.`
    : `${base}Enter English or Thai wording — required for this task.`;
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
  offer: OfferLike | null | undefined,
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
