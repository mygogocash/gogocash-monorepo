/**
 * Canonical country format: ISO-3166-1 alpha-2, uppercase ("TH", "SG", "MY").
 *
 * Single source of truth for label ↔ code conversion across the app:
 *   - Storage / over-the-wire: ISO-2 ("TH").
 *   - Display: full English name ("Thailand"), looked up via `iso2ToLabel`.
 *
 * Add a new market by inserting one entry in `LABEL_TO_ISO2` — `iso2ToLabel`
 * is derived from it, so the two stay aligned.
 */

const LABEL_TO_ISO2: Readonly<Record<string, string>> = {
  thailand: "TH",
  singapore: "SG",
  malaysia: "MY",
  indonesia: "ID",
  philippines: "PH",
  vietnam: "VN",
  japan: "JP",
  taiwan: "TW",
  "hong kong": "HK",
  china: "CN",
  india: "IN",
  australia: "AU",
  "new zealand": "NZ",
  "united states": "US",
  "united states of america": "US",
  "united kingdom": "GB",
  cambodia: "KH",
  laos: "LA",
  myanmar: "MM",
  "south korea": "KR",
  "korea, republic of": "KR",
};

const ISO2_TO_LABEL: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = {};
  for (const [label, iso2] of Object.entries(LABEL_TO_ISO2)) {
    // First label wins so duplicates ("united states" vs "united states of america")
    // don't override the canonical display form.
    if (!out[iso2]) {
      out[iso2] =
        label.charAt(0).toUpperCase() +
        label.slice(1).replace(/\s(.)/g, (_, c: string) => " " + c.toUpperCase());
    }
  }
  return out;
})();

/**
 * Convert any country string (ISO-2, full English name, mixed case, padded
 * whitespace) to canonical ISO-2 uppercase. Returns `""` on null/empty input.
 *
 * Unknown 2-char inputs are uppercased and returned as-is (assumed already ISO-2).
 * Unknown longer inputs fall through to trimmed-uppercase so equal strings
 * still compare equal — preserves correctness for markets we haven't mapped yet.
 *
 * Used at the read boundary (`useUserCountry`) to defend against legacy users
 * whose `country` was written before the format was standardised, and against
 * cached NextAuth sessions issued pre-migration. Once those have aged out,
 * this normalisation becomes a no-op for every caller.
 */
export function toIso2(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const mapped = LABEL_TO_ISO2[trimmed.toLowerCase()];
  if (mapped) return mapped;
  return trimmed.toUpperCase();
}

/**
 * Convert ISO-2 to full English display name. Returns the input verbatim
 * for unmapped codes (so unmapped markets render as "XX" rather than empty).
 */
export function iso2ToLabel(iso2: string | null | undefined): string {
  if (!iso2) return "";
  const upper = iso2.trim().toUpperCase();
  return ISO2_TO_LABEL[upper] ?? upper;
}

/**
 * `true` iff `value` is already a canonical ISO-2 string. Useful for
 * one-off telemetry that surfaces residual non-canonical writers.
 */
export function isCanonicalIso2(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length === 2 && trimmed === trimmed.toUpperCase();
}

/** Re-export the raw label map for callers that need to enumerate markets. */
export { LABEL_TO_ISO2, ISO2_TO_LABEL };
