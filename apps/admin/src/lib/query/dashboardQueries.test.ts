import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiClient: apiClientMock,
}));

describe("fetchDashboardWithdrawSummary", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    vi.resetModules();
    apiClientMock.getDashboardSummary.mockReset();
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it("given real API URL and API error > then rethrows instead of mock fallback", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";
    const apiError = { message: "Dashboard summary unavailable" };
    apiClientMock.getDashboardSummary.mockRejectedValue(apiError);

    const { fetchDashboardWithdrawSummary } =
      await import("./dashboardQueries");

    await expect(fetchDashboardWithdrawSummary()).rejects.toEqual(apiError);
  });

  it("given no API URL and API error > then returns MOCK_DASHBOARD_SUMMARY", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    apiClientMock.getDashboardSummary.mockRejectedValue(
      new Error("mock route failed"),
    );

    const { fetchDashboardWithdrawSummary, MOCK_DASHBOARD_SUMMARY } =
      await import("./dashboardQueries");

    await expect(fetchDashboardWithdrawSummary()).resolves.toEqual(
      MOCK_DASHBOARD_SUMMARY,
    );
  });

  it("given a whitespace-only API URL and API error > then returns mock summary", async () => {
    process.env.NEXT_PUBLIC_API_URL = "   ";
    apiClientMock.getDashboardSummary.mockRejectedValue(
      new Error("mock route failed"),
    );

    const { fetchDashboardWithdrawSummary, MOCK_DASHBOARD_SUMMARY } =
      await import("./dashboardQueries");

    await expect(fetchDashboardWithdrawSummary()).resolves.toEqual(
      MOCK_DASHBOARD_SUMMARY,
    );
  });

  it("given successful API response > then returns summary data", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";
    const summary = {
      conversionCount: 10,
      conversionTotalPayout: 100,
      withdrawByStatus: {
        pending: { count: 1, total: 50 },
        approved: { count: 2, total: 75 },
        rejected: { count: 0, total: 0 },
      },
    };
    apiClientMock.getDashboardSummary.mockResolvedValue(summary);

    const { fetchDashboardWithdrawSummary } =
      await import("./dashboardQueries");

    await expect(fetchDashboardWithdrawSummary()).resolves.toEqual(summary);
  });
});
