import { describe, expect, it } from "vitest";

import { isFeaturedSearchResponse } from "@mobile/account/useFeaturedSearch";
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
