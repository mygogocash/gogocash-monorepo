// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDashboardInsights,
  buildDashboardSummaryExtended,
} from "./dashboardInsightsBuilder";
import type { DashboardStatsResponse } from "@/types/api";

const axiosMock = vi.hoisted(() => ({
  request: vi.fn(),
  isAxiosError: vi.fn(),
}));

vi.mock("axios", () => ({
  default: Object.assign(axiosMock.request, {
    isAxiosError: axiosMock.isAxiosError,
  }),
}));

describe("apiClient dashboard routes", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";
    axiosMock.request.mockResolvedValue({ data: {} });
    axiosMock.isAxiosError.mockReturnValue(false);
  });

  afterEach(() => {
    delete process.env.API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.clearAllMocks();
  });

  it("uses the guarded Nest dashboard namespace in real-API mode", async () => {
    const stats = {
      gogocashUsers: 11,
      mycashbackUsers: 7,
    } satisfies DashboardStatsResponse;
    const summary = buildDashboardSummaryExtended();
    const insights = buildDashboardInsights(new URLSearchParams("range=30d"));
    axiosMock.request
      .mockResolvedValueOnce({ data: stats })
      .mockResolvedValueOnce({ data: summary })
      .mockResolvedValueOnce({ data: insights });
    const { apiClient } = await import("./api");

    await expect(apiClient.getDashboardStats()).resolves.toEqual(stats);
    await expect(apiClient.getDashboardSummary()).resolves.toEqual(summary);
    await expect(
      apiClient.getDashboardInsights({ range: "30d" }),
    ).resolves.toEqual(insights);

    expect(axiosMock.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "GET",
        url: "/api/backend/admin/dashboard/stats",
      }),
    );
    expect(axiosMock.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "GET",
        url: "/api/backend/admin/dashboard/summary",
      }),
    );
    expect(axiosMock.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: "GET",
        url: "/api/backend/admin/dashboard/insights?range=30d",
      }),
    );
    expect(Object.keys(insights).sort()).toEqual(
      [
        "alerts",
        "availability",
        "commissionHealth",
        "conversionsByStatus",
        "currency",
        "insightSummary",
        "kpis",
        "lastUpdated",
        "networkBreakdown",
        "payoutRatio",
        "period",
        "quests",
        "range",
        "statistics",
        "topOffers",
        "withdrawByStatus",
        "withdrawMetrics",
      ].sort(),
    );
    expect(Object.keys(insights.availability).sort()).toEqual([
      "clicks",
      "commissionHealth",
      "quests",
    ]);
    expect(insights.topOffers[0]).toEqual(
      expect.objectContaining({
        networkId: expect.any(String),
        providerAccount: expect.any(String),
      }),
    );
  });

  it("fails closed when the stats endpoint still returns the legacy contract", async () => {
    axiosMock.request.mockResolvedValueOnce({
      data: {
        totalUsers: 11,
        newUsersLast30d: 2,
        totalConversions: 4,
        totalWithdraws: 1,
        countryBreakdown: [],
      },
    });
    const { apiClient } = await import("./api");

    await expect(apiClient.getDashboardStats()).rejects.toMatchObject({
      name: "DashboardResponseCompatibilityError",
      code: "DASHBOARD_API_INCOMPATIBLE",
      endpoint: "stats",
    });
  });

  it("fails closed when the summary endpoint still returns the legacy contract", async () => {
    axiosMock.request.mockResolvedValueOnce({
      data: {
        conversions: { approved: { count: 2, totalPayout: 10 } },
        withdrawals: { pending: { count: 1, totalAmount: 5 } },
      },
    });
    const { apiClient } = await import("./api");

    await expect(apiClient.getDashboardSummary()).rejects.toMatchObject({
      name: "DashboardResponseCompatibilityError",
      code: "DASHBOARD_API_INCOMPATIBLE",
      endpoint: "summary",
    });
  });

  it("fails closed when insights are legacy or omit availability metadata", async () => {
    const legacyInsights = {
      range: "30d",
      conversions: [],
      withdrawals: [],
      newUsers: [],
    };
    const missingAvailability = buildDashboardInsights(
      new URLSearchParams("range=30d"),
    ) as unknown as Record<string, unknown>;
    delete missingAvailability.availability;
    axiosMock.request
      .mockResolvedValueOnce({ data: legacyInsights })
      .mockResolvedValueOnce({ data: missingAvailability });
    const { apiClient } = await import("./api");

    await expect(
      apiClient.getDashboardInsights({ range: "30d" }),
    ).rejects.toMatchObject({
      name: "DashboardResponseCompatibilityError",
      code: "DASHBOARD_API_INCOMPATIBLE",
      endpoint: "insights",
    });
    await expect(
      apiClient.getDashboardInsights({ range: "30d" }),
    ).rejects.toMatchObject({
      name: "DashboardResponseCompatibilityError",
      endpoint: "insights",
    });
  });

  it("encodes custom insight windows before forwarding them", async () => {
    axiosMock.request.mockResolvedValueOnce({
      data: buildDashboardInsights(
        new URLSearchParams("range=custom:2026-07-01:2026-07-18"),
      ),
    });
    const { apiClient } = await import("./api");

    await apiClient.getDashboardInsights({
      range: "custom:2026-07-01:2026-07-18",
    });

    expect(axiosMock.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/backend/admin/dashboard/insights?range=custom%3A2026-07-01%3A2026-07-18",
      }),
    );
  });

  it("preserves the dashboard mock namespace when no real API is configured", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    axiosMock.request
      .mockResolvedValueOnce({
        data: { gogocashUsers: 11, mycashbackUsers: 7 },
      })
      .mockResolvedValueOnce({ data: buildDashboardSummaryExtended() })
      .mockResolvedValueOnce({
        data: buildDashboardInsights(new URLSearchParams("range=7d")),
      });
    const { apiClient } = await import("./api");

    await apiClient.getDashboardStats();
    await apiClient.getDashboardSummary();
    await apiClient.getDashboardInsights({ range: "7d" });

    expect(axiosMock.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: "/api/mock/dashboard/stats" }),
    );
    expect(axiosMock.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: "/api/mock/dashboard/summary" }),
    );
    expect(axiosMock.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ url: "/api/mock/dashboard/insights?range=7d" }),
    );
  });
});
