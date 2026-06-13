import { describe, expect, it } from "vitest";

import { formatMessageFromEnThCatalog } from "./formatMessageFromEnThCatalog";

describe("formatMessageFromEnThCatalog", () => {
  it("formats gogoquestHistoryInsightUp from bundled en.json", () => {
    const s = formatMessageFromEnThCatalog("gogoquestHistoryInsightUp", "en", {
      percent: 42,
      recentMonth: "March 2025",
      olderMonth: "February 2025",
    });
    expect(s).toContain("42");
    expect(s).toContain("March 2025");
    expect(s).toContain("February 2025");
  });

  it("uses th catalog for locale th", () => {
    const s = formatMessageFromEnThCatalog("gogoquestHistoryInsightTitle", "th", {});
    expect(s.length).toBeGreaterThan(0);
    expect(s).not.toBe("gogoquestHistoryInsightTitle");
  });

  it("formats gogoquestHistoryActivityStrip", () => {
    const s = formatMessageFromEnThCatalog("gogoquestHistoryActivityStrip", "en", {
      active: 2,
      total: 3,
    });
    expect(s).toContain("2");
    expect(s).toContain("3");
  });
});
