// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn() }));
const permissions = vi.hoisted(() => ({ apiRole: "viewer", can: vi.fn() }));

vi.mock("@/lib/axios/client", () => ({ default: api }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    apiRole: permissions.apiRole,
    can: permissions.can,
    ready: true,
  }),
}));

import WithdrawFeeCouponTable, {
  getWithdrawFeeCouponStatus,
  type WithdrawFeeCoupon,
} from "./WithdrawFeeCouponTable";

const activeCoupon: WithdrawFeeCoupon = {
  _id: "coupon-1",
  code: "SAVE10",
  currency: "THB",
  disabled: false,
  discount_mode: "fixed",
  discount_value: 10,
  end_at: "2026-08-01T23:59:59.000Z",
  name: "Save ten",
  quantity: 100,
  quantity_used: 2,
  start_at: "2026-07-01T00:00:00.000Z",
  unlimited_quantity: false,
  usage_per_user: 1,
};

function listResponse(
  overrides: Partial<{ page: number; total: number }> = {},
) {
  return {
    data: {
      data: [activeCoupon],
      limit: 25,
      page: overrides.page ?? 1,
      total: overrides.total ?? 75,
    },
  };
}

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <WithdrawFeeCouponTable />
    </QueryClientProvider>,
  );
}

describe("WithdrawFeeCouponTable", () => {
  beforeEach(() => {
    permissions.apiRole = "viewer";
    permissions.can.mockReset().mockReturnValue(false);
    api.get.mockReset().mockResolvedValue(listResponse());
    api.patch.mockReset().mockResolvedValue({ data: activeCoupon });
    api.post.mockReset().mockResolvedValue({ data: activeCoupon });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each(["support", "approver"])(
    "lets API %s operators manage coupons despite conservative frontend role mapping",
    async (apiRole) => {
      permissions.apiRole = apiRole;
      renderTable();

      expect(await screen.findByText("SAVE10")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create fee coupon" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Disable" }),
      ).toBeInTheDocument();
    },
  );

  it("keeps coupon writes hidden from a viewer", async () => {
    permissions.apiRole = "viewer";
    renderTable();

    expect(await screen.findByText("SAVE10")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create fee coupon" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Disable" })).toBeNull();
  });

  it("queries beyond the first 50 rows and debounces server search", async () => {
    renderTable();
    expect(await screen.findByText("SAVE10")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/admin/withdraw-fee-coupons", {
      params: { limit: 25, page: 1, search: undefined },
      signal: expect.any(AbortSignal),
    });

    api.get.mockClear();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search fee coupons" }),
      {
        target: { value: "holiday" },
      },
    );
    expect(api.get).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/admin/withdraw-fee-coupons", {
        params: { limit: 25, page: 1, search: "holiday" },
        signal: expect.any(AbortSignal),
      }),
    );

    api.get.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/admin/withdraw-fee-coupons", {
        params: { limit: 25, page: 2, search: "holiday" },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("surfaces the real API reason when enable or disable fails", async () => {
    permissions.can.mockReturnValue(true);
    api.patch.mockRejectedValueOnce({
      response: {
        data: { message: "Coupon is attached to a pending withdrawal." },
      },
    });
    renderTable();

    await userEvent.click(
      await screen.findByRole("button", { name: "Disable" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Coupon is attached to a pending withdrawal.",
    );
  });
});

describe("getWithdrawFeeCouponStatus", () => {
  const now = new Date("2026-07-18T12:00:00.000Z");

  it.each([
    [{ ...activeCoupon, disabled: true }, "Disabled"],
    [{ ...activeCoupon, start_at: "2026-07-19T00:00:00.000Z" }, "Scheduled"],
    [{ ...activeCoupon, end_at: "2026-07-17T23:59:59.000Z" }, "Expired"],
    [{ ...activeCoupon, quantity: 2, quantity_used: 2 }, "Exhausted"],
    [activeCoupon, "Active"],
  ] as const)("maps lifecycle state to %s", (coupon, expected) => {
    expect(getWithdrawFeeCouponStatus(coupon, now)).toBe(expected);
  });
});
