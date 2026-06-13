/**
 * Single source of truth for marketing copy, schema, and FAQ consistency (SEO / AEO).
 * Update here first, then align visible copy if needed.
 */
export const SITE_FACTS = {
  brandName: "GoGoCash",
  partnerCountMin: 70,
  /** Shown in copy as "70+" */
  partnerCountLabel: "70+",
  maxCashbackPhrase: "up to 30%",
  keyMerchantsShort: "Shopee, Lazada, Agoda",
  regionLabel: "Southeast Asia",
  countriesIso: ["TH", "ID", "MY", "SG", "PH", "VN"] as const,
  countriesList:
    "Thailand, Indonesia, Malaysia, Singapore, the Philippines, and Vietnam",
  /** Community size callout (hero / footer); keep in sync with product claims */
  shopperCommunityLabel: "6M+",
} as const;

/** One-line hero supporting sentence: keywords without stuffing. */
export function heroSeoSupportingLine(): string {
  return `Earn ${SITE_FACTS.maxCashbackPhrase} cashback at ${SITE_FACTS.partnerCountLabel} partners — ${SITE_FACTS.keyMerchantsShort}, and more across ${SITE_FACTS.regionLabel}.`;
}

/** Hero body: earn framing + optional quests line (English home). */
export function heroEarnSupportingParagraph(): string {
  return `${heroSeoSupportingLine()} Stack quests and bonus boosts in the app when you want an extra win.`;
}

/** Partners strip: reward-first intro (English home). */
export function partnersStripEarnDescription(): string {
  return `Earn at brands you already shop — ${SITE_FACTS.partnerCountLabel} partners across ${SITE_FACTS.regionLabel}. Find a brand, open it from GoGoCash before checkout, and your visit is tracked so cashback can confirm after the merchant validates your order.`;
}

/** Short blurb for meta / schema where a full sentence is needed. */
export function siteSeoOneLiner(): string {
  return `Shop via ${SITE_FACTS.brandName} at ${SITE_FACTS.partnerCountLabel} partners across ${SITE_FACTS.regionLabel}. Earn ${SITE_FACTS.maxCashbackPhrase} real cashback at brands like ${SITE_FACTS.keyMerchantsShort}.`;
}
