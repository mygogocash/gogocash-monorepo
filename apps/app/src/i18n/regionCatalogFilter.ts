import type { RegionCode } from "@mobile/i18n/regionTypes";

const SOUTHEAST_ASIA_REGION_CODES = ["TH", "VN", "SG", "MY", "ID", "PH"] as const;

const REGION_COUNTRY_ALIASES: Record<string, readonly string[]> = {
  TH: ["th", "thailand"],
  TW: ["tw", "taiwan"],
  CN: ["cn", "china"],
  JP: ["jp", "japan"],
  SG: ["sg", "singapore"],
  MY: ["my", "malaysia"],
  ID: ["id", "indonesia"],
  PH: ["ph", "philippines"],
  VN: ["vn", "vietnam"],
};

function parseCountryTokens(countries: string | undefined): string[] {
  return (countries ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function countryTokenMatchesRegion(token: string, regionCode: string): boolean {
  const normalizedRegion = regionCode.trim().toUpperCase();
  const aliases = REGION_COUNTRY_ALIASES[normalizedRegion] ?? [normalizedRegion.toLowerCase()];
  return aliases.includes(token);
}

export function resolveApiCountryParam(regionCode: string): string | undefined {
  const normalized = regionCode.trim().toUpperCase();
  if (!normalized || normalized === "SEA") {
    return undefined;
  }
  return normalized;
}

export function offerMatchesRegion(
  countries: string | undefined,
  regionCode: RegionCode | string,
  isGlobal?: boolean,
): boolean {
  if (isGlobal === true) {
    return true;
  }

  const normalizedRegion = regionCode.trim().toUpperCase();
  const countryTokens = parseCountryTokens(countries);

  if (normalizedRegion === "SEA") {
    return countryTokens.some((token) =>
      SOUTHEAST_ASIA_REGION_CODES.some((code) => countryTokenMatchesRegion(token, code)),
    );
  }

  if (countryTokens.length === 0) {
    // Legacy offers without country metadata stay visible until admin tags them.
    return true;
  }

  return countryTokens.some((token) => countryTokenMatchesRegion(token, normalizedRegion));
}

export function filterCatalogItemsByRegion<T extends { countries?: string; isGlobal?: boolean }>(
  items: readonly T[],
  regionCode: RegionCode | string,
): T[] {
  return items.filter((item) =>
    offerMatchesRegion(item.countries, regionCode, item.isGlobal),
  );
}
