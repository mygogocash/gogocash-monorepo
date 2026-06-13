import { describe, expect, it } from "vitest";
import { HEADER_SEARCH_MESSAGE_KEYS, mergeHeaderSearchMessages } from "./headerSearchMerge";

describe("mergeHeaderSearchMessages", () => {
  it("leaves JSON values when present", () => {
    const base = {
      headerSearchTrendingTitle: "From JSON",
      other: 1,
    };
    const merged = mergeHeaderSearchMessages(base, "en");
    expect(merged.headerSearchTrendingTitle).toBe("From JSON");
    expect(merged.other).toBe(1);
  });

  it("fills missing header search keys from en fallbacks", () => {
    const merged = mergeHeaderSearchMessages({}, "en");
    expect(merged.headerSearchTrendingTitle).toBe("Popular right now");
    expect(merged.headerSearchTrendingPill).toBe("Trending");
  });

  it("fills missing keys from th fallbacks", () => {
    const merged = mergeHeaderSearchMessages({}, "th");
    expect(merged.headerSearchTrendingTitle).toBe("ยอดนิยมตอนนี้");
  });

  it("covers every declared key in fallbacks", () => {
    const mergedEn = mergeHeaderSearchMessages({}, "en");
    const mergedTh = mergeHeaderSearchMessages({}, "th");
    for (const key of HEADER_SEARCH_MESSAGE_KEYS) {
      expect(typeof mergedEn[key]).toBe("string");
      expect((mergedEn[key] as string).length).toBeGreaterThan(0);
      expect(typeof mergedTh[key]).toBe("string");
      expect((mergedTh[key] as string).length).toBeGreaterThan(0);
    }
  });
});
