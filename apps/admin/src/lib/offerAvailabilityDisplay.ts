import { formatOfferCountries } from "./offerDisplay";

export type OfferAvailabilityFields = {
  countries?: string | null;
  is_global?: boolean | null;
  default_country?: string | null;
};

export type OfferAvailabilityDisplay = {
  isGlobal: boolean;
  availabilityLabel: "Global" | "Country-specific";
  configuredCountry: string;
  fallbackCountry: string;
  tableContextLabel: string;
  clarification: string | null;
};

const LEGACY_INTERNATIONAL_CLARIFICATION =
  "Legacy “International” value (not global)";

function includesLegacyInternational(countries: string | null | undefined) {
  return String(countries ?? "")
    .split(",")
    .some((country) => country.trim().toLowerCase() === "international");
}

/**
 * Converts the three independent availability fields into one admin display
 * contract. `is_global` alone controls worldwide reach; `countries` remains
 * the configured offer variant, and `default_country` is only meaningful for
 * global routing.
 */
export function getOfferAvailabilityDisplay(
  offer: OfferAvailabilityFields,
): OfferAvailabilityDisplay {
  const isGlobal = offer.is_global === true;
  const configuredCountry = formatOfferCountries(offer.countries);
  const fallbackCountry = isGlobal
    ? String(offer.default_country ?? "").trim() || "Not configured"
    : "Not applicable";
  const clarification =
    !isGlobal && includesLegacyInternational(offer.countries)
      ? LEGACY_INTERNATIONAL_CLARIFICATION
      : null;

  return {
    isGlobal,
    availabilityLabel: isGlobal ? "Global" : "Country-specific",
    configuredCountry,
    fallbackCountry,
    tableContextLabel: isGlobal
      ? `Default/fallback: ${fallbackCountry}`
      : "Configured country / variant",
    clarification,
  };
}
