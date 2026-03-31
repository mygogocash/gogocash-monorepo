import { describe, expect, it } from "vitest";

import {
  computeMonthOverMonthInsight,
  countActiveMonthsInWindow,
  nextSoftGoal,
} from "./gogoquestInsights";

describe("computeMonthOverMonthInsight", () => {
  it("returns null for empty", () => {
    expect(computeMonthOverMonthInsight([])).toBeNull();
  });

  it("returns first_month for single row", () => {
    expect(computeMonthOverMonthInsight([{ month: "2025-03", points: 40 }])).toEqual({
      kind: "first_month",
      month: "2025-03",
      points: 40,
    });
  });

  it("detects up percent", () => {
    expect(
      computeMonthOverMonthInsight([
        { month: "2025-02", points: 50 },
        { month: "2025-03", points: 100 },
      ])
    ).toEqual({
      kind: "up",
      percent: 100,
      recentMonth: "2025-03",
      olderMonth: "2025-02",
      recentPoints: 100,
      olderPoints: 50,
    });
  });

  it("detects down percent", () => {
    expect(
      computeMonthOverMonthInsight([
        { month: "2025-02", points: 100 },
        { month: "2025-03", points: 75 },
      ])
    ).toEqual({
      kind: "down",
      percent: 25,
      recentMonth: "2025-03",
      olderMonth: "2025-02",
      recentPoints: 75,
      olderPoints: 100,
    });
  });

  it("handles zero older month with positive recent as up 100%", () => {
    expect(
      computeMonthOverMonthInsight([
        { month: "2025-02", points: 0 },
        { month: "2025-03", points: 10 },
      ])
    ).toMatchObject({ kind: "up", percent: 100 });
  });
});

describe("countActiveMonthsInWindow", () => {
  it("counts months with points in rolling window", () => {
    const fixed = new Date(Date.UTC(2025, 2, 15)); // March 2025
    const n = countActiveMonthsInWindow(
      [
        { month: "2025-01", points: 1 },
        { month: "2025-02", points: 0 },
        { month: "2025-03", points: 5 },
      ],
      3,
      fixed
    );
    expect(n).toBe(2);
  });
});

describe("nextSoftGoal", () => {
  it("returns next tier", () => {
    expect(nextSoftGoal(0)).toBe(100);
    expect(nextSoftGoal(99)).toBe(100);
    expect(nextSoftGoal(100)).toBe(250);
    expect(nextSoftGoal(5000)).toBeNull();
  });
});
