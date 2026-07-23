import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  getDashboardStats: vi.fn(),
  getDashboardSummary: vi.fn(),
  getUsers: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiClient: apiClientMock,
}));

describe("fetchDashboardWithdrawSummary", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    vi.resetModules();
    apiClientMock.getDashboardStats.mockReset();
    apiClientMock.getDashboardSummary.mockReset();
    apiClientMock.getUsers.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("given real API URL and incompatible stats > then rethrows instead of fabricating user counts", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";
    const compatibilityError = {
      code: "DASHBOARD_API_INCOMPATIBLE",
      message: "Dashboard API upgrade in progress",
    };
    apiClientMock.getDashboardStats.mockRejectedValue(compatibilityError);

    const { fetchDashboardUserStats } = await import("./dashboardQueries");

    await expect(fetchDashboardUserStats()).rejects.toEqual(compatibilityError);
    expect(apiClientMock.getUsers).not.toHaveBeenCalled();
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

  it("given production without an API URL > then fails closed before any mock request", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PUBLIC_API_URL;
    apiClientMock.getDashboardSummary.mockResolvedValue(
      (await import("./dashboardQueries")).MOCK_DASHBOARD_SUMMARY,
    );

    const { fetchDashboardWithdrawSummary, isRealApiConfigured } =
      await import("./dashboardQueries");

    expect(isRealApiConfigured()).toBe(true);
    await expect(fetchDashboardWithdrawSummary()).rejects.toThrow(
      /Dashboard API is not configured/i,
    );
    expect(apiClientMock.getDashboardSummary).not.toHaveBeenCalled();
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
