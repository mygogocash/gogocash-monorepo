import { describe, expect, it } from "vitest";

import {
  createSerializedRunner,
  dedupeSearchTerms,
  normalizeSearchQuery,
  parseSearchHistoryPayload,
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

describe("searchHistory > dedupeSearchTerms", () => {
  it("given duplicate terms > then keeps first occurrence case-insensitively", () => {
    expect(dedupeSearchTerms(["Shopee", "shopee", " Lazada ", "Shopee"])).toEqual([
      "Shopee",
      "Lazada",
    ]);
  });
});

describe("searchHistory > parseSearchHistoryPayload", () => {
  it("given duplicate stored entries > then dedupes on read", () => {
    expect(parseSearchHistoryPayload(JSON.stringify(["Shopee", "shopee", "Lazada"]))).toEqual([
      "Shopee",
      "Lazada",
    ]);
  });

  it("given more than max stored entries > then caps at SEARCH_HISTORY_MAX on read", () => {
    const entries = Array.from({ length: SEARCH_HISTORY_MAX + 5 }, (_, index) => `term-${index}`);
    const parsed = parseSearchHistoryPayload(JSON.stringify(entries));

    expect(parsed).toHaveLength(SEARCH_HISTORY_MAX);
    expect(parsed[0]).toBe("term-0");
    expect(parsed.at(-1)).toBe(`term-${SEARCH_HISTORY_MAX - 1}`);
  });
});

describe("searchHistory > createSerializedRunner", () => {
  it("given overlapping tasks > then runs them in order", async () => {
    const runSerialized = createSerializedRunner();
    const order: number[] = [];

    const first = runSerialized(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
      order.push(1);
      return "a";
    });
    const second = runSerialized(async () => {
      order.push(2);
      return "b";
    });

    await Promise.all([first, second]);
    expect(order).toEqual([1, 2]);
  });
});
