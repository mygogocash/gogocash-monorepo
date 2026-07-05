/**
 * Maps Figma export categories to admin offer media fields (FormOffer "Logos & media").
 *
 * Admin UI labels:
 *   Logo        → logo_desktop + logo_mobile (square 1:1)
 *   Brand cover → logo_circle (shop page cover, 1200×410)
 *   Banner      → banner (+ banner_mobile) — not synced by this script
 */

/** @typedef {'logo-circle' | 'shop-page-banner'} SyncCategory */

/** @type {Record<SyncCategory, readonly string[]>} */
export const CATEGORY_TO_OFFER_FIELDS = {
  "logo-circle": ["logo_desktop", "logo_mobile"],
  "shop-page-banner": ["logo_circle"],
};

const SYNC_CATEGORIES = Object.keys(CATEGORY_TO_OFFER_FIELDS);

/**
 * @param {Array<{ slug: string; category: string; relativePath: string }>} manifestRows
 * @returns {Map<string, Partial<Record<SyncCategory, string>>>}
 */
export function buildAssetsBySlug(manifestRows) {
  /** @type {Map<string, Partial<Record<SyncCategory, string>>>} */
  const bySlug = new Map();

  for (const row of manifestRows) {
    if (!SYNC_CATEGORIES.includes(row.category)) continue;
    const slug = String(row.slug || "").trim();
    if (!slug) continue;
    const entry = bySlug.get(slug) ?? {};
    entry[row.category] = row.relativePath;
    bySlug.set(slug, entry);
  }

  return bySlug;
}

/**
 * Normalize lookup_value to a manifest slug stem (strip trailing _xx country code).
 * @param {string | null | undefined} lookupValue
 */
export function normalizeLookupSlug(lookupValue) {
  const trimmed = String(lookupValue || "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.replace(/_[a-z]{2}$/i, "");
}

/**
 * Whether an offer lookup_value matches a manifest brand slug.
 * @param {string | null | undefined} lookupValue
 * @param {string} slug
 */
export function lookupMatchesSlug(lookupValue, slug) {
  const normalizedLookup = String(lookupValue || "").trim().toLowerCase();
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!normalizedLookup || !normalizedSlug) return false;
  if (normalizedLookup === normalizedSlug) return true;
  if (normalizeLookupSlug(normalizedLookup) === normalizedSlug) return true;
  if (
    normalizedLookup.startsWith(`${normalizedSlug}_`) ||
    normalizedLookup.startsWith(`${normalizedSlug}-`)
  ) {
    return true;
  }
  return false;
}

/**
 * @param {Partial<Record<SyncCategory, string>>} assets
 * @returns {{ category: SyncCategory; relativePath: string; offerFields: readonly string[] }[]}
 */
export function planOfferMediaUpdates(assets) {
  /** @type {{ category: SyncCategory; relativePath: string; offerFields: readonly string[] }[]} */
  const plans = [];

  for (const category of SYNC_CATEGORIES) {
    const relativePath = assets[category];
    if (!relativePath) continue;
    plans.push({
      category,
      relativePath,
      offerFields: CATEGORY_TO_OFFER_FIELDS[category],
    });
  }

  return plans;
}
