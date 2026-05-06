import type { DataOffer } from "@/interfaces/offer";

/**
 * Country format reconciliation.
 *
 * The system has two writers using different formats for the same field:
 *   - User profile `country` is the full English name ("Thailand"), set on signup
 *     from the country picker label.
 *   - Offer `countries` is the ISO-2 code ("TH"), shipped by Involve Asia and
 *     other affiliate feeds.
 *
 * The previous implementation lowercased both sides and string-compared, which
 * meant `"thailand" !== "th"` → every brand card disappeared on every discovery
 * surface for every signed-in user (see docs/SECURITY_REVIEW.md history note).
 *
 * `canonicaliseCountry()` collapses both formats to ISO-2 uppercase so the
 * comparison agrees regardless of which side wrote what. Unknown countries
 * fall through to a trimmed-uppercased value so countries we don't yet map
 * still compare correctly when both sides write the same string.
 *
 * This is the single source of truth for country equality on this surface;
 * extend `COUNTRY_NAME_TO_ISO2` when adding a new market.
 */
const COUNTRY_NAME_TO_ISO2: Readonly<Record<string, string>> = {
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
  "united kingdom": "GB",
};

function canonicaliseCountry(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  // ISO-2 short-circuit — already canonical, just normalise case.
  if (trimmed.length === 2) return trimmed.toUpperCase();
  // Full English name → ISO-2 from the lookup table.
  const mapped = COUNTRY_NAME_TO_ISO2[lower];
  if (mapped) return mapped;
  // Unknown country: return trimmed-uppercased so equal strings still equal.
  return trimmed.toUpperCase();
}

/**
 * Visibility rule: a customer should see an offer when EITHER
 *   - the offer's `countries` field includes the customer's country, OR
 *   - the offer's brand is flagged `is_global` (visible worldwide).
 *
 * Comparison is format-agnostic (see `canonicaliseCountry`) — `"Thailand"`
 * matches `"TH"` matches `"th"`.
 *
 * When `userCountry` is null/empty (guest, profile not set), only global brands
 * are returned — this avoids leaking country-targeted promos to users whose
 * locale we can't verify.
 */
export function isOfferVisibleToCountry(offer: DataOffer, userCountry: string | null | undefined): boolean {
  if (offer.is_global) return true;
  if (!userCountry) return false;
  const userIso = canonicaliseCountry(userCountry);
  if (!userIso) return false;
  if (!offer.countries) return false;
  return offer.countries
    .split(",")
    .map(canonicaliseCountry)
    .filter(Boolean)
    .includes(userIso);
}

/**
 * Filter a list of offers down to what's visible to the given customer country.
 * See {@link isOfferVisibleToCountry} for the per-offer rule.
 */
export function filterOffersByCountry<T extends DataOffer>(offers: readonly T[], userCountry: string | null | undefined): T[] {
  return offers.filter((o) => isOfferVisibleToCountry(o, userCountry));
}

/**
 * Compute a stable brand-identity key for grouping country variants of the same brand.
 *
 * Strategy:
 *   1. `merchant_id` (partner network merchant id) — shared across country variants when the partner
 *      keeps one merchant row across markets (Shopee, Lazada, Apple, etc.).
 *   2. Fallback: strip a trailing `_xx` country code from `lookup_value`
 *      (e.g. `apple_th` → `apple`, `nike_sg` → `nike`) — used when `merchant_id` is 0/missing.
 *   3. Last resort: the offer's `_id`, which keeps each row in its own group (no dedupe).
 */
function brandKey(offer: DataOffer): string {
  if (offer.merchant_id && offer.merchant_id > 0) return `mid:${offer.merchant_id}`;
  if (offer.lookup_value) {
    const stem = String(offer.lookup_value).replace(/_[a-z]{2}$/i, "");
    if (stem) return `lv:${stem}`;
  }
  return `id:${offer._id}`;
}

/**
 * Pick the best country variant for the given user from a list of variants of one brand.
 *
 * Resolution order:
 *   1. Exact match on `userCountry` — that variant.
 *   2. Variant whose `countries` matches the brand's `default_country` (any variant in the group
 *      that names the same default).
 *   3. First variant flagged `is_global=true`.
 *   4. First variant in the list (so callers always get a result when the input is non-empty).
 *
 * Returns `null` only if `variants` is empty.
 */
export function pickBrandVariant<T extends DataOffer>(variants: readonly T[], userCountry: string | null | undefined): T | null {
  if (variants.length === 0) return null;
  const userIso = canonicaliseCountry(userCountry);
  if (userIso) {
    const exact = variants.find((v) => {
      if (!v.countries) return false;
      return v.countries
        .split(",")
        .map(canonicaliseCountry)
        .filter(Boolean)
        .includes(userIso);
    });
    if (exact) return exact;
  }
  // Look for any variant in the group whose `default_country` is set, then match a variant whose
  // `countries` field contains that default. Different variants may name different defaults; prefer
  // the first one we encounter.
  const variantWithDefault = variants.find((v) => v.default_country);
  if (variantWithDefault?.default_country) {
    const defIso = canonicaliseCountry(variantWithDefault.default_country);
    if (defIso) {
      const defaultMatch = variants.find((v) => {
        if (!v.countries) return false;
        return v.countries
          .split(",")
          .map(canonicaliseCountry)
          .filter(Boolean)
          .includes(defIso);
      });
      if (defaultMatch) return defaultMatch;
    }
  }
  const globalVariant = variants.find((v) => v.is_global === true);
  if (globalVariant) return globalVariant;
  return variants[0] ?? null;
}

/**
 * Group offers by brand and pick one variant per brand for the given user country.
 *
 * Combines {@link filterOffersByCountry} (drop offers the user isn't allowed to see) with
 * variant selection — so a global brand with TH and SG variants shows up exactly once for any
 * user, with the right tracking link / commission for their country (or the brand default).
 *
 * Order is stable: each brand appears at the position of the first offer in its group.
 */
export function dedupeOffersByBrand<T extends DataOffer>(offers: readonly T[], userCountry: string | null | undefined): T[] {
  const visible = offers.filter((o) => isOfferVisibleToCountry(o, userCountry));
  const groups = new Map<string, T[]>();
  const order: string[] = [];
  for (const o of visible) {
    const key = brandKey(o);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(o);
  }
  return order
    .map((key) => pickBrandVariant(groups.get(key) ?? [], userCountry))
    .filter((o): o is T => o != null);
}
