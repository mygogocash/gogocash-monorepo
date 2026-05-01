import type { DataOffer } from "@/interfaces/offer";

/**
 * Visibility rule: a customer should see an offer when EITHER
 *   - the offer's `countries` field includes the customer's country, OR
 *   - the offer's brand is flagged `is_global` (visible worldwide).
 *
 * Country comparison is case-insensitive and trims whitespace, since `countries`
 * comes from a comma-separated string in the upstream feed (e.g. `"Thailand, Singapore"`).
 *
 * When `userCountry` is null/empty (guest, profile not set), only global brands are returned —
 * this avoids leaking country-targeted promos to users whose locale we can't verify.
 */
export function isOfferVisibleToCountry(offer: DataOffer, userCountry: string | null | undefined): boolean {
  if (offer.is_global) return true;
  if (!userCountry) return false;
  const normalized = userCountry.trim().toLowerCase();
  if (!normalized) return false;
  if (!offer.countries) return false;
  return offer.countries
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

/**
 * Filter a list of offers down to what's visible to the given customer country.
 * See {@link isOfferVisibleToCountry} for the per-offer rule.
 */
export function filterOffersByCountry<T extends DataOffer>(offers: readonly T[], userCountry: string | null | undefined): T[] {
  return offers.filter((o) => isOfferVisibleToCountry(o, userCountry));
}
