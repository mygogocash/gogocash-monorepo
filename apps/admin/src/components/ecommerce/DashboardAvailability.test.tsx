// @vitest-environment happy-dom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  DashboardDataAvailability,
  DashboardInsightsResponse,
} from "@/types/api";

const queryState = vi.hoisted(() => ({
  value: {} as {
    data?: DashboardInsightsResponse;
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
  },
}));

const chartRenderState = vi.hoisted(() => ({
  options: undefined as
    | {
        colors?: string[];
        yaxis?: Array<{
          seriesName?: string;
          show?: boolean;
          opposite?: boolean;
        }>;
      }
    | undefined,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => queryState.value,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockChart({
      series,
      options,
    }: {
      series: Array<{ name: string }>;
      options: NonNullable<typeof chartRenderState.options>;
    }) {
      chartRenderState.options = options;
      return (
        <div data-testid="chart-series">
          {series.map((row) => row.name).join(",")}
        </div>
      );
    },
}));

vi.mock("@/hooks/useHtmlDarkClass", () => ({
  useHtmlDarkClass: () => false,
}));

import { DashboardInsightDetails } from "./DashboardInsightDetails";
import { DashboardQuestAnalyticsSection } from "./DashboardQuestAnalyticsSection";
import { ExecutiveSummary } from "./ExecutiveSummary";
import StatisticsChart from "./StatisticsChart";

const unavailable: DashboardDataAvailability = {
  available: false,
  reason: "This analytics source is not connected.",
};

const fixture: DashboardInsightsResponse = {
  lastUpdated: "2026-07-18T12:00:00.000Z",
  range: "30d",
  currency: "THB",
  availability: {
    clicks: unavailable,
    commissionHealth: unavailable,
    quests: unavailable,
  },
  period: {
    from: "2026-06-18T12:00:00.000Z",
    to: "2026-07-18T12:00:00.000Z",
  },
  kpis: {
    current: {
      gogocashUsers: 1,
      mycashbackUsers: 1,
      conversionCount: 1,
      conversionTotalPayout: 10,
      conversionTotalSaleAmount: 100,
    },
    prior: null,
    newUsersInPeriod: 1,
  },
  withdrawByStatus: {
    pending: { count: 0, total: 0, oldestAt: null },
    approved: { count: 0, total: 0 },
    rejected: { count: 0, total: 0 },
  },
  withdrawMetrics: {
    approvalRatePct: null,
    pendingOver48hCount: 0,
    rejectedSharePct: null,
  },
  conversionsByStatus: { approved: 1 },
  payoutRatio: 0.1,
  topOffers: [],
  networkBreakdown: [],
  commissionHealth: {
    missingAdminCap: 0,
    missingPartnerCap: 0,
    adminOverPartner: 0,
  },
  alerts: [],
  insightSummary: "One conversion.",
  statistics: Object.fromEntries(
    ["day", "week", "month", "quarter", "year"].map((key) => [
      key,
      {
        categories: ["2026-07-18"],
        series: [
          { name: "Clicks", data: [0] },
          { name: "Conversions", data: [1] },
          { name: "Sale Amount", data: [100] },
          { name: "Estimated Earnings", data: [10] },
        ],
        description: `${key} activity`,
      },
    ]),
  ) as DashboardInsightsResponse["statistics"],
  quests: {
    totalQuests: 0,
    liveNow: 0,
    scheduled: 0,
    ended: 0,
    overlappingSelectedRange: 0,
    totalParticipantsInOverlapping: 0,
    rows: [],
    engagement: {
      enrolledInOverlapping: 0,
      activeInOverlapping: 0,
      fullCompletesInOverlapping: 0,
      pointsIssuedInOverlapping: 0,
    },
    attribution: {
      attributedConversionsInPeriod: 0,
      attributedGmvInPeriod: 0,
      attributedPayoutInPeriod: 0,
      shareOfPeriodConversionsPct: null,
    },
    funnelTotals: { viewed: 0, joined: 0, tasksStarted: 0, fullyCompleted: 0 },
    taskMix: { offerTasks: 0, merchantTasks: 0, conditionalTasks: 0 },
    channels: {
      questsWithFacebook: 0,
      questsWithLine: 0,
      questsWithBanner: 0,
    },
    timeline: [],
    leaderboardPreview: null,
  },
};

afterEach(() => {
  cleanup();
  chartRenderState.options = undefined;
});

describe("dashboard unavailable analytics", () => {
  it("labels quest analytics unavailable instead of rendering operational zeroes", () => {
    render(
      <DashboardQuestAnalyticsSection
        quests={fixture.quests}
        rangeLabel="Last 30 days"
        availability={unavailable}
      />,
    );

    expect(screen.getByText("Quest analytics unavailable")).toBeTruthy();
    expect(screen.queryByText("0 in catalog")).toBeNull();
  });

  it("shows honest loading states without rendering mock statistics", () => {
    queryState.value = {
      data: undefined,
      isLoading: true,
      isError: false,
    };

    render(<StatisticsChart insightRange="30d" />);

    expect(screen.getByText("Loading dashboard statistics…")).toBeTruthy();
    expect(screen.queryByTestId("chart-series")).toBeNull();
    expect(screen.queryByText("Summary")).toBeNull();
  });

  it("shows the compatibility failure instead of mock statistics or a perpetual skeleton", () => {
    const compatibilityError = new Error(
      "Dashboard data is temporarily unavailable during an API upgrade.",
    );
    queryState.value = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: compatibilityError,
    };

    const { rerender } = render(<StatisticsChart insightRange="30d" />);
    expect(screen.getByText(compatibilityError.message)).toBeTruthy();
    expect(screen.queryByTestId("chart-series")).toBeNull();

    rerender(<DashboardInsightDetails range="30d" />);
    expect(screen.getByText(compatibilityError.message)).toBeTruthy();
    expect(document.querySelector(".animate-pulse")).toBeNull();

    rerender(<ExecutiveSummary range="30d" />);
    expect(screen.getByText(compatibilityError.message)).toBeTruthy();
  });

  it("labels commission health unavailable instead of healthy zeroes", () => {
    queryState.value = { data: fixture, isLoading: false, isError: false };
    render(<DashboardInsightDetails range="30d" />);

    expect(screen.getByText("Commission analytics unavailable")).toBeTruthy();
    expect(screen.queryByText("Missing admin max cap")).toBeNull();
  });

  it("shows quest summary and click card as unavailable and omits click chart series", () => {
    queryState.value = { data: fixture, isLoading: false, isError: false };
    const { rerender } = render(<ExecutiveSummary range="30d" />);

    expect(
      screen.getByText("Quests live").parentElement?.textContent,
    ).toContain("Unavailable");

    rerender(<StatisticsChart insightRange="30d" />);
    expect(screen.getByText("Clicks").parentElement?.textContent).toContain(
      "Unavailable",
    );
    expect(screen.getByTestId("chart-series").textContent).toBe(
      "Conversions,Sale Amount,Estimated Earnings",
    );
    expect(chartRenderState.options?.colors).toHaveLength(3);
    expect(chartRenderState.options?.yaxis).toEqual([
      expect.objectContaining({ seriesName: "Conversions", show: true }),
      expect.objectContaining({
        seriesName: "Sale Amount",
        show: true,
        opposite: true,
      }),
      expect.objectContaining({
        seriesName: "Estimated Earnings",
        show: false,
      }),
    ]);
  });
});
