import { describe, expect, it } from "vitest";

import {
  filterCatalogItemsByRegion,
  offerMatchesRegion,
  resolveApiCountryParam,
} from "@mobile/i18n/regionCatalogFilter";

describe("regionCatalogFilter > resolveApiCountryParam", () => {
  it("given ISO region codes > then returns the same code for API query params", () => {
    expect(resolveApiCountryParam("TH")).toBe("TH");
    expect(resolveApiCountryParam("TW")).toBe("TW");
    expect(resolveApiCountryParam("th")).toBe("TH");
  });

  it("given Southeast Asia aggregate > then omits API param for client-side filtering", () => {
    expect(resolveApiCountryParam("SEA")).toBeUndefined();
  });
});

describe("regionCatalogFilter > offerMatchesRegion", () => {
  it("given global offers > then matches every region", () => {
    expect(offerMatchesRegion(undefined, "TW", true)).toBe(true);
    expect(offerMatchesRegion("TH", "TW", true)).toBe(true);
  });

  it("given Thailand region > then matches TH tokens and Thailand label", () => {
    expect(offerMatchesRegion("TH", "TH")).toBe(true);
    expect(offerMatchesRegion("TH,VN", "TH")).toBe(true);
    expect(offerMatchesRegion("Thailand", "TH")).toBe(true);
    expect(offerMatchesRegion("TW", "TH")).toBe(false);
  });

  it("given Taiwan region > then matches TW-only offers", () => {
    expect(offerMatchesRegion("TW", "TW")).toBe(true);
    expect(offerMatchesRegion("TH", "TW")).toBe(false);
  });

  it("given Southeast Asia region > then matches any SEA member country", () => {
    expect(offerMatchesRegion("TH", "SEA")).toBe(true);
    expect(offerMatchesRegion("VN", "SEA")).toBe(true);
    expect(offerMatchesRegion("TW", "SEA")).toBe(false);
  });

  it("given missing countries on a legacy offer > then remains visible in every region", () => {
    expect(offerMatchesRegion(undefined, "TH")).toBe(true);
    expect(offerMatchesRegion("", "TW")).toBe(true);
  });
});

describe("regionCatalogFilter > filterCatalogItemsByRegion", () => {
  it("given catalog rows with countries > then keeps only rows for the active region", () => {
    const items = [
      { brand: "Shopee TH", countries: "TH" },
      { brand: "Shopee TW", countries: "TW" },
      { brand: "Global Mall", countries: "TH", isGlobal: true },
    ];

    expect(filterCatalogItemsByRegion(items, "TH")).toEqual([
      { brand: "Shopee TH", countries: "TH" },
      { brand: "Global Mall", countries: "TH", isGlobal: true },
    ]);
  });
});
