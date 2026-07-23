import { describe, expect, it } from "vitest";

import {
  DEFAULT_MARKET_CODE,
  defaultLookupFromBrandAndCountry,
  slugifyBrandForLookup,
} from "./createBrandLookupSlug";

describe("slugifyBrandForLookup", () => {
  it("lowercases, strips accents, and snake-cases", () => {
    expect(slugifyBrandForLookup("Bangkok Airways")).toBe("bangkok_airways");
    expect(slugifyBrandForLookup("  Café  Étoile! ")).toBe("cafe_etoile");
    expect(slugifyBrandForLookup("A---B")).toBe("a_b");
  });
});

describe("defaultLookupFromBrandAndCountry", () => {
  it("defaults every brand to the international `_in` suffix (founder request 2026-07-22)", () => {
    expect(defaultLookupFromBrandAndCountry("Bangkok Airways")).toBe(
      "bangkok_airways_in",
    );
    expect(DEFAULT_MARKET_CODE).toBe("in");
  });

  it("ignores the country argument for the default suffix", () => {
    // Previously produced bangkok_airways_th / _id / _us; now always _in.
    expect(defaultLookupFromBrandAndCountry("Bangkok Airways", "Thailand")).toBe(
      "bangkok_airways_in",
    );
    expect(defaultLookupFromBrandAndCountry("Lazada", "Indonesia")).toBe(
      "lazada_in",
    );
    expect(defaultLookupFromBrandAndCountry("Apple", "United States of America")).toBe(
      "apple_in",
    );
  });

  it("returns empty string when the brand name has no slug-able characters", () => {
    expect(defaultLookupFromBrandAndCountry("")).toBe("");
    expect(defaultLookupFromBrandAndCountry("   ", "Thailand")).toBe("");
  });
});
