/**
 * Normalizes a brand name into an API-style lookup slug (e.g. bangkok_airways_in).
 * Used by the Create brand form; keep pure for predictable behavior and tests.
 */

// Founder request 2026-07-22: every brand's lookup slug defaults to the "in"
// (international) market suffix — e.g. `bangkok_airways_in` — instead of the prior
// country-derived suffix (`_th`, `_id`, …). Admins can still override the slug manually
// in the form. NOTE: lookup_value is the customer deep-link / dedupe key, so this only
// changes the DEFAULT for newly-created brands; existing brands keep their slugs.
export const DEFAULT_MARKET_CODE = "in";

export function slugifyBrandForLookup(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Default lookup slug for a brand: `<snake_case_name>_in`. The `countryValue` argument is
 * retained for call-site compatibility but no longer affects the default suffix.
 */
export function defaultLookupFromBrandAndCountry(
  brandName: string,
  _countryValue?: string,
): string {
  const brandPart = slugifyBrandForLookup(brandName);
  if (!brandPart) return "";
  return `${brandPart}_${DEFAULT_MARKET_CODE}`;
}
