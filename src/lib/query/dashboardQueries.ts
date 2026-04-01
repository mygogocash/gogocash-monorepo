import { apiClient } from "@/lib/api";
import type {
  DashboardStatsResponse,
  DashboardSummaryResponse,
} from "@/types/api";

export const MOCK_DASHBOARD_STATS: DashboardStatsResponse = {
  gogocashUsers: 550,
  mycashbackUsers: 550,
};

export const MOCK_DASHBOARD_SUMMARY: DashboardSummaryResponse = {
  conversionCount: 550,
  conversionTotalPayout: 124750.5,
  withdrawByStatus: {
    pending: { count: 12, total: 8450.0 },
    approved: { count: 88, total: 52300.25 },
    rejected: { count: 5, total: 1200.0 },
  },
};

export async function fetchDashboardUserStats(): Promise<DashboardStatsResponse> {
  try {
    return await apiClient.getDashboardStats();
  } catch {
    const res = await apiClient.getUsers({ limit: 1, page: 1 });
    return {
      gogocashUsers: res.pagination?.total ?? 0,
      mycashbackUsers: 0,
    };
  }
}

export async function fetchDashboardWithdrawSummary(): Promise<DashboardSummaryResponse> {
  try {
    return await apiClient.getDashboardSummary();
  } catch {
    return MOCK_DASHBOARD_SUMMARY;
  }
}

export type ExecutiveDashboardBundle = {
  stats: DashboardStatsResponse;
  summary: DashboardSummaryResponse;
};

/** Matches legacy ExecutiveSummary load: stats with fallback to users count; summary or full mock on failure. */
export async function fetchExecutiveDashboard(): Promise<ExecutiveDashboardBundle> {
  try {
    const [stats, summary] = await Promise.all([
      apiClient.getDashboardStats().catch(async () => {
        const users = await apiClient.getUsers({ limit: 1, page: 1 });
        return {
          gogocashUsers: users.pagination?.total ?? MOCK_DASHBOARD_STATS.gogocashUsers,
          mycashbackUsers: MOCK_DASHBOARD_STATS.mycashbackUsers,
        } satisfies DashboardStatsResponse;
      }),
      apiClient.getDashboardSummary(),
    ]);
    return { stats, summary };
  } catch {
    return {
      stats: MOCK_DASHBOARD_STATS,
      summary: MOCK_DASHBOARD_SUMMARY,
    };
  }
}
