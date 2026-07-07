// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchDashboardWithdrawSummaryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/query/dashboardQueries", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/query/dashboardQueries")>();
  return {
    ...actual,
    fetchDashboardWithdrawSummary: fetchDashboardWithdrawSummaryMock,
  };
});

import { DashboardWithdrawSummary } from "./DashboardWithdrawSummary";
import { MOCK_DASHBOARD_SUMMARY } from "@/lib/query/dashboardQueries";

function renderSummary() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardWithdrawSummary />
    </QueryClientProvider>,
  );
}

describe("DashboardWithdrawSummary", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    fetchDashboardWithdrawSummaryMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it("given real API URL and query error > then surfaces error instead of mock totals", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";
    fetchDashboardWithdrawSummaryMock.mockRejectedValue({
      message: "Dashboard summary unavailable",
    });

    renderSummary();

    expect(
      await screen.findByText("Dashboard summary unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pending withdrawal/i)).not.toBeInTheDocument();
  });

  it("given no API URL and successful mock summary > then renders mock totals", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    fetchDashboardWithdrawSummaryMock.mockResolvedValue(MOCK_DASHBOARD_SUMMARY);

    renderSummary();

    await waitFor(() => {
      expect(screen.getByText(/12 pending withdrawals need review/i)).toBeInTheDocument();
    });
  });
});
