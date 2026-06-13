import { describe, expect, it } from "vitest";
import { parseRestCountriesPayload, sortCountriesByName } from "./restCountries";

describe("parseRestCountriesPayload", () => {
  it("accepts valid payload", () => {
    const raw = [{ name: { common: "Thailand" }, cca2: "TH" }];
    const r = parseRestCountriesPayload(raw);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual(raw);
  });

  it("rejects invalid payload", () => {
    expect(parseRestCountriesPayload([{ bad: true }]).ok).toBe(false);
    expect(parseRestCountriesPayload(null).ok).toBe(false);
  });
});

describe("sortCountriesByName", () => {
  it("sorts by common name", () => {
    const rows = [
      { name: { common: "Zed" }, cca2: "ZZ" },
      { name: { common: "Alpha" }, cca2: "AA" },
    ];
    expect(sortCountriesByName(rows).map((r) => r.cca2)).toEqual(["AA", "ZZ"]);
  });
});
