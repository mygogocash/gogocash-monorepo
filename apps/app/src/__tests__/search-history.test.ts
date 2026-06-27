import { describe, expect, it } from "vitest";

import {
  normalizeSearchQuery,
  pushSearchHistory,
  removeSearchHistoryItem,
  SEARCH_HISTORY_MAX,
} from "@mobile/search/searchHistoryCore";

describe("searchHistory > pushSearchHistory", () => {
  it("given empty query > then keeps history unchanged", () => {
    expect(pushSearchHistory(["Shopee"], "   ")).toEqual(["Shopee"]);
  });

  it("given new query > then prepends and dedupes case-insensitively", () => {
    expect(pushSearchHistory(["Lazada", "shopee"], "Shopee")).toEqual(["Shopee", "Lazada"]);
  });

  it("given more than max entries > then caps at SEARCH_HISTORY_MAX", () => {
    const history = Array.from({ length: SEARCH_HISTORY_MAX }, (_, index) => `term-${index}`);
    const next = pushSearchHistory(history, "fresh");
    expect(next).toHaveLength(SEARCH_HISTORY_MAX);
    expect(next[0]).toBe("fresh");
  });
});

describe("searchHistory > normalizeSearchQuery", () => {
  it("given padded text > then trims whitespace", () => {
    expect(normalizeSearchQuery("  Orbit Airways  ")).toBe("Orbit Airways");
  });
});

describe("searchHistory > removeSearchHistoryItem", () => {
  it("given matching query > then removes case-insensitively", () => {
    expect(removeSearchHistoryItem(["Glow Theory", "Shopee"], "glow theory")).toEqual(["Shopee"]);
  });

  it("given empty query > then keeps history unchanged", () => {
    expect(removeSearchHistoryItem(["Shopee"], "   ")).toEqual(["Shopee"]);
  });
});
