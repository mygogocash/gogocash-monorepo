// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getCouponInsights: vi.fn() }));

vi.mock("@/lib/api/couponInsightsApi", () => api);

import CouponHistoryTable from "./CouponHistoryTable";

const response = {
  coupon: {
    code: "SAVE10",
    discount: 10,
    id: "507f1f77bcf86cd799439011",
    name: "Save ten",
    offerName: "Example Shop",
  },
  metrics: {
    codeCopies: 4,
    copyRate: 40,
    detailViews: 10,
    usageAmount: 3,
    usageUnit: "redemptions" as const,
  },
  redemptions: {
    data: [
      {
        id: "activity-1",
        referenceId: "merchant-order-42",
        status: "redeemed" as const,
        usedAt: "2026-07-15T08:30:00.000Z",
        userEmail: "member@example.com",
        userId: "customer-42",
      },
    ],
    limit: 25,
    page: 1,
    total: 1,
    totalPages: 1,
  },
};

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CouponHistoryTable couponId={response.coupon.id} />
    </QueryClientProvider>,
  );
}

describe("CouponHistoryTable per-coupon real insights", () => {
  beforeEach(() => api.getCouponInsights.mockResolvedValue(response));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads one coupon and lands on its redemption history", async () => {
    renderTable();

    expect(await screen.findByText("Save ten")).toBeInTheDocument();
    expect(screen.getByText("merchant-order-42")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(api.getCouponInsights).toHaveBeenCalledWith(response.coupon.id, {
      limit: 25,
      page: 1,
    });
  });

  it("renames the engagement tab to Insight and shows real usage amount", async () => {
    const user = userEvent.setup();
    renderTable();

    await screen.findByText("Save ten");
    await user.click(screen.getByRole("tab", { name: "Insight" }));

    expect(screen.getByText("Detail views")).toBeInTheDocument();
    expect(screen.getByText("Code copies")).toBeInTheDocument();
    expect(screen.getByText("Copy rate")).toBeInTheDocument();
    expect(screen.getByText("Usage amount")).toBeInTheDocument();
    expect(screen.getByText("3 redemptions")).toBeInTheDocument();
    expect(screen.queryByText(/sample data/i)).not.toBeInTheDocument();
  });
});
