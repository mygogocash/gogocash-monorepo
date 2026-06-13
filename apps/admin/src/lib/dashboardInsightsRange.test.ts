import { describe, it, expect } from "vitest";
import { parseRangeParam, rangeWindow } from "@/lib/dashboardInsightsBuilder";

describe("parseRangeParam", () => {
  it("given a known preset > returns it", () => {
    expect(parseRangeParam("7d")).toBe("7d");
  });

  it("given an unknown value > falls back to 30d", () => {
    expect(parseRangeParam("nonsense")).toBe("30d");
  });

  it("given a custom token > preserves it unchanged", () => {
    expect(parseRangeParam("custom:2026-05-01:2026-05-10")).toBe(
      "custom:2026-05-01:2026-05-10",
    );
  });
});

describe("rangeWindow > custom range", () => {
  const now = new Date(2026, 5, 2, 12, 0, 0); // 2 Jun 2026, local

  it("uses the custom dates for the current window", () => {
    const w = rangeWindow("custom:2026-05-01:2026-05-10", now);
    expect(w.current.from.getMonth()).toBe(4); // May
    expect(w.current.from.getDate()).toBe(1);
    expect(w.current.from.getHours()).toBe(0); // start of day
    expect(w.current.to.getDate()).toBe(10);
    expect(w.current.to.getHours()).toBe(23); // end of day
  });

  it("produces an equal-length prior window ending at the current start", () => {
    const w = rangeWindow("custom:2026-05-01:2026-05-10", now);
    expect(w.prior).not.toBeNull();
    expect(w.prior!.to.getTime()).toBe(w.current.from.getTime());
    const curLen = w.current.to.getTime() - w.current.from.getTime();
    const priorLen = w.prior!.to.getTime() - w.prior!.from.getTime();
    expect(priorLen).toBe(curLen);
  });
});
