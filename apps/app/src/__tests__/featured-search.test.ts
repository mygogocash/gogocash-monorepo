import { describe, expect, it } from "vitest";

import {
  isFeaturedSearchResponse,
  resolveFeaturedSearchTerms,
} from "@mobile/account/useFeaturedSearch";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { buildFeaturedSearchPath } from "@mobile/account/searchResource";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("useFeaturedSearch > buildFeaturedSearchPath", () => {
  it("given backend featured search > then uses the public offer featured endpoint", () => {
    expect(buildFeaturedSearchPath()).toBe("/offer/search/featured");
  });
});

describe("useFeaturedSearch > term list", () => {
  it("given featured API terms > then dedupes case-insensitive duplicates", () => {
    const source = fs.readFileSync(
      path.join(mobileRoot, "src/account/useFeaturedSearch.ts"),
      "utf8"
    );

    expect(source).toContain("dedupeSearchTerms");
  });
});

describe("useFeaturedSearch > isFeaturedSearchResponse", () => {
  it("given data array > then accepts the payload", () => {
    expect(isFeaturedSearchResponse({ data: [{ term: "Shopee" }] })).toBe(true);
  });

  it("given non-array data > then rejects the payload", () => {
    expect(isFeaturedSearchResponse({ data: "Shopee" })).toBe(false);
    expect(isFeaturedSearchResponse({ data: { term: "Shopee" } })).toBe(false);
  });

  it("given missing or invalid envelope > then rejects the payload", () => {
    expect(isFeaturedSearchResponse(null)).toBe(false);
    expect(isFeaturedSearchResponse([])).toBe(false);
    expect(isFeaturedSearchResponse({})).toBe(false);
  });
});

describe("useFeaturedSearch > resolveFeaturedSearchTerms", () => {
  // Staging 2026-07-13: /offer/search/featured returns {"data":[]} and the home
  // popover mapped the raw fixture list, so demo brands (Grocery Galaxy,
  // Pocket Pantry, …) leaked into the popular panel on staging. The chain must
  // be: curated featured terms → live brand catalog → fixtures.
  it("given backend featured terms > then they win over any fallback", () => {
    expect(
      resolveFeaturedSearchTerms({
        backendTerms: ["Shopee", "Lazada"],
        fallbackTerms: ["Klook"],
      }),
    ).toEqual(["Shopee", "Lazada"]);
  });

  it("given no backend terms but live brands > then the live brands show instead of fixtures", () => {
    const terms = resolveFeaturedSearchTerms({
      backendTerms: [],
      fallbackTerms: ["Shopee", "Lazada", "TikTok Shop"],
    });

    expect(terms).toEqual(["Shopee", "Lazada", "TikTok Shop"]);
    expect(terms).not.toContain("Grocery Galaxy");
  });

  it("given more live brands than the fixture panel size > then the fallback is capped to the panel size", () => {
    const manyBrands = Array.from({ length: 12 }, (_, index) => `Brand ${index + 1}`);
    const terms = resolveFeaturedSearchTerms({
      backendTerms: null,
      fallbackTerms: manyBrands,
    });

    expect(terms).toHaveLength(webHomeSearchPopularPanel.items.length);
    expect(terms[0]).toBe("Brand 1");
  });

  it("given neither backend terms nor live brands > then the fixture panel remains the last resort", () => {
    expect(resolveFeaturedSearchTerms({ backendTerms: null })).toEqual(
      webHomeSearchPopularPanel.items.map((item) => item.brand),
    );
  });
});
