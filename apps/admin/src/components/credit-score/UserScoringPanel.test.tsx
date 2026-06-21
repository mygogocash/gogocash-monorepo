// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const adminModulesApi = vi.hoisted(() => ({
  getCreditScoreAudit: vi.fn(),
  getCreditScoreDetail: vi.fn(),
  putCreditScoreOverride: vi.fn(),
}));

vi.mock("@/lib/api/adminModulesApi", () => ({
  getCreditScoreAudit: adminModulesApi.getCreditScoreAudit,
  getCreditScoreDetail: adminModulesApi.getCreditScoreDetail,
  putCreditScoreOverride: adminModulesApi.putCreditScoreOverride,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    role: "super_admin",
    can: () => true,
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("recharts", () => ({
  CartesianGrid: () => <g data-testid="cartesian-grid" />,
  Line: () => <g data-testid="line" />,
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
}));

import UserScoringPanel from "./UserScoringPanel";

function renderPanel(userId = "unknown-user") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UserScoringPanel userId={userId} />
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe("UserScoringPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminModulesApi.getCreditScoreAudit.mockResolvedValue([]);
  });

  it("UserScoringPanel__given_partial_credit_score_detail__then_renders_without_factor_crash", async () => {
    adminModulesApi.getCreditScoreDetail.mockResolvedValue({
      userId: "unknown-user",
      userName: "Quest Winner",
      email: "",
      currentScore: 0,
      tier: "bronze",
      lastUpdated: "2026-06-17T00:00:00.000Z",
    });

    renderPanel();

    expect(await screen.findByText("Credit score")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(
      screen.getByText("No score factors recorded for this user."),
    ).toBeInTheDocument();
  });

  it("UserScoringPanel__given_null_credit_score_detail__then_renders_empty_state", async () => {
    adminModulesApi.getCreditScoreDetail.mockResolvedValue(null);

    renderPanel();

    expect(
      await screen.findByText("No score data for this user."),
    ).toBeInTheDocument();
  });
});
