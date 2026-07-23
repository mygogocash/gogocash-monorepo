// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
}));
const permissions = vi.hoisted(() => ({
  apiRole: "viewer",
  can: vi.fn(),
}));

vi.mock("@/lib/axios/client", () => ({ default: api }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    apiRole: permissions.apiRole,
    can: permissions.can,
    ready: true,
  }),
}));
vi.mock("./FormCoupon", () => ({ default: () => null }));
vi.mock("./CouponBrandCell", () => ({
  CouponBrandCell: () => <span>Example Shop</span>,
}));

import CouponTable from "./CouponTable";
import type { CouponData, ResponseCoupon } from "@/types/coupon";

const coupon: CouponData = {
  __v: 0,
  _id: "507f1f77bcf86cd799439011",
  code: "SAVE10",
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  description: "Ten percent off",
  disabled: false,
  discount: 10,
  discount_type: "percent",
  eligibility: "all_users",
  end_date: "2026-08-31",
  link: "https://example.com/save",
  max_cap: "100",
  min_spend: "500",
  name: "Save ten",
  offer_id: {
    _id: "507f1f77bcf86cd799439012",
    offer_name: "Example Shop",
  },
  quantity: 100,
  quantity_used: 3,
  start_date: "2026-07-01",
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
};

function couponResponse(data: CouponData[]): ResponseCoupon {
  return {
    data,
    limit: "10",
    page: "1",
    total: data.length,
    totalPages: 1,
  };
}

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CouponTable />
    </QueryClientProvider>,
  );
}

async function openDeleteConfirmation() {
  await screen.findByText("Save ten");
  await userEvent.click(screen.getByRole("button", { name: "Actions" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
}

describe("CouponTable coupon archive", () => {
  beforeEach(() => {
    api.delete.mockReset().mockResolvedValue({
      data: { archived: true, id: coupon._id },
    });
    api.get.mockReset().mockResolvedValue({
      data: couponResponse([coupon]),
    });
    permissions.apiRole = "approver";
    permissions.can.mockReset().mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("confirms and removes an archived coupon from Coupon History", async () => {
    api.get
      .mockResolvedValueOnce({ data: couponResponse([coupon]) })
      .mockResolvedValue({ data: couponResponse([]) });
    renderTable();

    await openDeleteConfirmation();

    expect(
      screen.getByText(
        /preserving its redemption and engagement audit history/i,
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Delete coupon" }),
    );

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith(`/offer/coupons/${coupon._id}`),
    );
    await waitFor(() => expect(screen.queryByText("Save ten")).toBeNull());
  });

  it("keeps the dialog open and surfaces the API rejection message", async () => {
    api.delete.mockRejectedValue({
      response: {
        data: {
          message: "Coupon deletion is temporarily locked for reconciliation.",
        },
      },
    });
    renderTable();

    await openDeleteConfirmation();
    await userEvent.click(
      screen.getByRole("button", { name: "Delete coupon" }),
    );

    expect(
      await screen.findByText(/temporarily locked for reconciliation/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Save ten")).toBeInTheDocument();
  });

  it("does not offer deletion below the API approver tier", async () => {
    permissions.apiRole = "support";
    renderTable();

    await screen.findByText("Save ten");
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));

    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
