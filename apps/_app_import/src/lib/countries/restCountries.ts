import { z } from "zod";

export const countryRowSchema = z.object({
  name: z.object({ common: z.string() }),
  cca2: z.string(),
  flags: z.record(z.string(), z.unknown()).optional(),
});

export const countriesResponseSchema = z.array(countryRowSchema);

export type RestCountryRow = z.infer<typeof countryRowSchema>;

export function parseRestCountriesPayload(
  raw: unknown
): { ok: true; data: RestCountryRow[] } | { ok: false } {
  const parsed = countriesResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false };
  }
  return { ok: true, data: parsed.data };
}

export function sortCountriesByName(rows: RestCountryRow[]): RestCountryRow[] {
  return [...rows].sort((a, b) => a.name.common.localeCompare(b.name.common));
}
