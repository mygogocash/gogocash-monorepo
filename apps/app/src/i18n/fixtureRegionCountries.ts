/** Demo country tags for fixture catalog rows (subset of webTopBrandCards). */
export const FIXTURE_BRAND_COUNTRIES: Partial<Record<string, string>> = {
  "Circuit Nest": "TW",
  "Glow Theory": "TH",
  "Grocery Galaxy": "TH",
  "Mint Mirror": "TW",
  "Orbit Airways": "TW",
  "PixelPort": "TW",
  "Pocket Pantry": "TH",
};

export function resolveFixtureBrandCountries(brand: string): string {
  return FIXTURE_BRAND_COUNTRIES[brand] ?? "TH";
}
