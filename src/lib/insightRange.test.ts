import { describe, it, expect } from "vitest";
import {
  customRangeToken,
  isCustomRange,
  parseCustomRange,
  parseIsoDateLocal,
  presetRangeDates,
} from "@/lib/insightRange";

describe("customRangeToken > given a from and to date", () => {
  it("encodes a custom: token", () => {
    expect(customRangeToken("2026-05-01", "2026-05-31")).toBe(
      "custom:2026-05-01:2026-05-31",
    );
  });
});

describe("parseCustomRange", () => {
  it("given a valid custom token > returns the from and to parts", () => {
    expect(parseCustomRange("custom:2026-05-01:2026-05-31")).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
    });
  });

  it("given a preset value > returns null", () => {
    expect(parseCustomRange("30d")).toBeNull();
  });

  it("given a malformed/overflow date > returns null", () => {
    expect(parseCustomRange("custom:2026-13-40:2026-05-31")).toBeNull();
  });

  it("given the wrong number of segments > returns null", () => {
    expect(parseCustomRange("custom:2026-05-01")).toBeNull();
  });

  it("given null or undefined > returns null", () => {
    expect(parseCustomRange(null)).toBeNull();
    expect(parseCustomRange(undefined)).toBeNull();
  });
});

describe("isCustomRange", () => {
  it("given a valid custom token > returns true", () => {
    expect(isCustomRange("custom:2026-05-01:2026-05-31")).toBe(true);
  });

  it("given a preset > returns false", () => {
    expect(isCustomRange("7d")).toBe(false);
  });
});

describe("presetRangeDates", () => {
  const now = new Date(2026, 5, 2, 12, 0, 0); // 2 Jun 2026, local

  it("given a day preset > sets To to today and From N days back", () => {
    expect(presetRangeDates("7d", now)).toEqual({
      from: "2026-05-26",
      to: "2026-06-02",
    });
    expect(presetRangeDates("30d", now)).toEqual({
      from: "2026-05-03",
      to: "2026-06-02",
    });
  });

  it("given 'all' > leaves From blank with To today", () => {
    expect(presetRangeDates("all", now)).toEqual({ from: "", to: "2026-06-02" });
  });

  it("given a custom token > returns its own dates and ignores now", () => {
    expect(presetRangeDates("custom:2026-01-10:2026-02-20", now)).toEqual({
      from: "2026-01-10",
      to: "2026-02-20",
    });
  });
});

describe("parseIsoDateLocal", () => {
  it("given a valid ISO date > returns a local Date on that calendar day", () => {
    const d = parseIsoDateLocal("2026-05-01");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(4); // May (0-indexed)
    expect(d!.getDate()).toBe(1);
  });

  it("given an overflow date > returns null", () => {
    expect(parseIsoDateLocal("2026-02-31")).toBeNull();
  });
});
