import { describe, it, expect } from "vitest";
import {
  buildDashboardInsights,
  buildDashboardSummaryExtended,
  parseRangeParam,
  rangeWindow,
} from "@/lib/dashboardInsightsBuilder";
import {
  mockConversions,
  mockMyCashback,
  mockUsers,
} from "@/app/api/mock/data";

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

describe("mock dashboard commercial-count and financial-currency contract", () => {
  it("counts all commercial currencies while excluding non-THB and ineligible money", () => {
    const commercialRows = mockConversions.filter(
      (row) =>
        (row as typeof row & { quest_synthetic_reward?: boolean })
          .quest_synthetic_reward !== true &&
        row.offer_name !== "reward_conversion_quest",
    );
    const eligible = commercialRows.filter(
      (row) =>
        row.currency === "THB" &&
        ["approved", "pending", "paid"].includes(
          row.conversion_status.toLowerCase(),
        ),
    );
    const insights = buildDashboardInsights(new URLSearchParams("range=all"));
    const summary = buildDashboardSummaryExtended();

    expect(insights.currency).toBe("THB");
    expect(insights.kpis.current.conversionCount).toBe(commercialRows.length);
    expect(insights.kpis.current.conversionTotalPayout).toBe(
      Math.round(
        eligible.reduce((sum, row) => sum + Number(row.payout || 0), 0) * 100,
      ) / 100,
    );
    expect(insights.topOffers.every((row) => row.currency === "THB")).toBe(
      true,
    );
    expect(
      insights.networkBreakdown.every((row) => row.currency === "THB"),
    ).toBe(true);
    expect(
      insights.networkBreakdown.reduce((sum, row) => sum + row.gmv, 0),
    ).toBe(
      Math.round(
        eligible.reduce((sum, row) => sum + Number(row.sale_amount || 0), 0) *
          100,
      ) / 100,
    );
    expect(summary.currency).toBe("THB");
    expect(summary.conversionCount).toBe(commercialRows.length);
  });

  it("keeps every statistics tab empty for a no-data historical custom range", () => {
    const insights = buildDashboardInsights(
      new URLSearchParams("range=custom:1990-01-01:1990-01-02"),
    );

    expect(insights.kpis.current.conversionCount).toBe(0);
    for (const bundle of Object.values(insights.statistics)) {
      expect(bundle.categories).toEqual([]);
      expect(bundle.series.every((series) => series.data.length === 0)).toBe(
        true,
      );
    }
  });

  it("derives current and prior user counts as of their respective window ends", () => {
    const insights = buildDashboardInsights(new URLSearchParams("range=7d"));
    const window = rangeWindow("7d", new Date(insights.lastUpdated));
    const countAsOf = (rows: ReadonlyArray<{ createdAt: unknown }>, to: Date) =>
      rows.filter((row) => {
        const createdAt = new Date(String(row.createdAt));
        return !Number.isNaN(createdAt.getTime()) && createdAt <= to;
      }).length;

    expect(insights.kpis.current.gogocashUsers).toBe(
      countAsOf(mockUsers, window.current.to),
    );
    expect(insights.kpis.current.mycashbackUsers).toBe(
      countAsOf(mockMyCashback, window.current.to),
    );
    expect(insights.kpis.prior?.gogocashUsers).toBe(
      countAsOf(mockUsers, window.prior!.to),
    );
    expect(insights.kpis.prior?.mycashbackUsers).toBe(
      countAsOf(mockMyCashback, window.prior!.to),
    );
  });
});
