import type { Offer } from "@/types/api";
import type { OfferID } from "@/types/coupon";

type OfferLike = Pick<
  Offer | OfferID,
  "_id" | "offer_name" | "offer_name_display" | "countries" | "logo_desktop" | "logo_mobile" | "logo"
>;

export type { OfferLike };

/** Comma-separated country codes → display string, or em dash when empty. */
export function formatOfferCountries(
  countries: string | null | undefined,
): string {
  const formatted = String(countries ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean)
    .join(", ");
  return formatted || "—";
}

export function getOfferDisplayName(offer: OfferLike | null | undefined): string {
  if (!offer) return "—";
  return offer.offer_name_display || offer.offer_name || "—";
}

/** Square brand logo for admin lists and reference previews — not `logo_circle` (shop cover). */
export function resolveAdminOfferLogoPath(
  offer:
    | Pick<OfferLike, "logo_desktop" | "logo_mobile" | "logo">
    | null
    | undefined,
): string {
  if (!offer) return "";
  return (
    String(offer.logo_desktop ?? "").trim() ||
    String(offer.logo_mobile ?? "").trim() ||
    String(offer.logo ?? "").trim()
  );
}

/** Unique, searchable label for brand Autocomplete options. */
export function brandSearchOptionLabel(offer: OfferLike): string {
  const name = getOfferDisplayName(offer);
  const location = formatOfferCountries(offer.countries);
  const locationSuffix = location === "—" ? "" : ` · ${location}`;
  const uniqueSuffix = offer.offer_name?.match(/#\d+/)?.[0] ?? offer._id;
  return `${name}${locationSuffix} · ${uniqueSuffix}`;
}
