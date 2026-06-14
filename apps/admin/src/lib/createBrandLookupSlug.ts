/**
 * Normalizes brand + country into API-style lookup slugs (e.g. apple_th).
 * Used by Create brand form; keep pure for predictable behavior and tests.
 */

const COUNTRY_VALUE_TO_CODE: Record<string, string> = {
  Thailand: "th",
  Indonesia: "id",
  Vietnam: "vn",
  Philippines: "ph",
  Malaysia: "my",
  Singapore: "sg",
  "United States of America": "us",
  "United Kingdom": "gb",
};

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

export function defaultLookupFromBrandAndCountry(brandName: string, countryValue: string): string {
  const brandPart = slugifyBrandForLookup(brandName);
  const code =
    COUNTRY_VALUE_TO_CODE[countryValue] ??
    (slugifyBrandForLookup(countryValue).slice(0, 2) || "xx");
  if (!brandPart) return "";
  return `${brandPart}_${code}`;
}
