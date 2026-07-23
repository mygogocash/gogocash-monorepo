import { apiClient } from "@/lib/api";
import { isAdminApiConfigured } from "@/lib/adminApiMode";
import type {
  DashboardInsightRangeValue,
  DashboardInsightsResponse,
  DashboardStatsResponse,
  DashboardSummaryResponse,
} from "@/types/api";

export const MOCK_DASHBOARD_STATS: DashboardStatsResponse = {
  gogocashUsers: 550,
  mycashbackUsers: 550,
};

export const MOCK_DASHBOARD_SUMMARY: DashboardSummaryResponse = {
  currency: "THB",
  conversionCount: 550,
  conversionTotalPayout: 124750.5,
  withdrawByStatus: {
    pending: { count: 12, total: 8450.0 },
    approved: { count: 88, total: 52300.25 },
    rejected: { count: 5, total: 0 },
  },
};

const DASHBOARD_API_CONFIGURATION_MESSAGE =
  "Dashboard API is not configured for this production deployment.";

function assertDashboardApiConfiguration(): void {
  if (
    process.env.NODE_ENV === "production" &&
    !isAdminApiConfigured(process.env.NEXT_PUBLIC_API_URL)
  ) {
    throw new Error(DASHBOARD_API_CONFIGURATION_MESSAGE);
  }
}

export async function fetchDashboardUserStats(): Promise<DashboardStatsResponse> {
  try {
    assertDashboardApiConfiguration();
    return await apiClient.getDashboardStats();
  } catch (error) {
    if (isRealApiConfigured()) {
      throw error;
    }
    const res = await apiClient.getUsers({ limit: 1, page: 1 });
    return {
      gogocashUsers: res.pagination?.total ?? 0,
      mycashbackUsers: 0,
    };
  }
}

export function isRealApiConfigured(): boolean {
  // Production must fail closed even when its API URL was accidentally omitted;
  // callers use this flag to suppress fixture fallbacks in their error UI.
  return (
    process.env.NODE_ENV === "production" ||
    isAdminApiConfigured(process.env.NEXT_PUBLIC_API_URL)
  );
}

export async function fetchDashboardWithdrawSummary(): Promise<DashboardSummaryResponse> {
  try {
    assertDashboardApiConfiguration();
    return await apiClient.getDashboardSummary();
  } catch (error) {
    if (isRealApiConfigured()) {
      throw error;
    }
    return MOCK_DASHBOARD_SUMMARY;
  }
}

export const DASHBOARD_INSIGHTS_QUERY_KEY = ["dashboard", "insights"] as const;

export async function fetchDashboardInsights(
  range: DashboardInsightRangeValue = "30d",
): Promise<DashboardInsightsResponse> {
  assertDashboardApiConfiguration();
  return apiClient.getDashboardInsights({ range });
}
