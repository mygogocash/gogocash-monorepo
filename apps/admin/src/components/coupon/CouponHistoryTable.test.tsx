// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getCouponInsights: vi.fn(),
  recordCouponRedemption: vi.fn(),
}));
const permissions = vi.hoisted(() => ({ apiRole: "viewer", can: vi.fn() }));

vi.mock("@/lib/api/couponInsightsApi", () => api);
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    apiRole: permissions.apiRole,
    can: permissions.can,
    ready: true,
  }),
}));
vi.mock("@/components/form/date-picker", () => ({
  default: ({
    altFormat,
    ariaLabel,
    dateFormat,
    enableTime,
    id,
    label,
    onValueChange,
    value,
  }: {
    altFormat?: string;
    ariaLabel?: string;
    dateFormat?: string;
    enableTime?: boolean;
    id: string;
    label?: string;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <label>
      {label}
      <input
        aria-label={ariaLabel}
        data-alt-format={altFormat}
        data-date-format={dateFormat}
        data-datepicker-component="true"
        data-enable-time={enableTime ? "true" : "false"}
        data-testid={id}
        onChange={(event) => onValueChange?.(event.currentTarget.value)}
        value={value ?? ""}
      />
    </label>
  ),
}));

import CouponHistoryTable from "./CouponHistoryTable";

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

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
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    api.getCouponInsights.mockResolvedValue(response);
    api.recordCouponRedemption.mockResolvedValue({ recorded: true });
    permissions.apiRole = "viewer";
    permissions.can.mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it("loads one coupon and lands on its redemption history", async () => {
    renderTable();

    expect(await screen.findByText("Save ten")).toBeInTheDocument();
    expect(screen.getByText("merchant-order-42")).toBeInTheDocument();
    expect(screen.queryByText("member@example.com")).not.toBeInTheDocument();
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

  it("lets operations record one idempotent confirmed redemption", async () => {
    const user = userEvent.setup();
    renderTable();

    await screen.findByText("Save ten");
    await user.click(screen.getByText("Record confirmed redemption"));
    await user.type(
      screen.getByLabelText("Reference ID"),
      "  merchant-order-99  ",
    );
    const redemptionTime = screen.getByLabelText("Redemption time");
    expect(redemptionTime).toHaveAttribute("data-datepicker-component", "true");
    expect(redemptionTime).toHaveAttribute("data-enable-time", "true");
    expect(redemptionTime).toHaveAttribute("data-alt-format", "d/m/Y, H:i");
    expect(redemptionTime).not.toHaveAttribute("type", "datetime-local");
    const occurredAt = new Date(
      (redemptionTime as HTMLInputElement).value,
    ).toISOString();
    await user.click(screen.getByRole("button", { name: "Record redemption" }));

    await waitFor(() =>
      expect(api.recordCouponRedemption).toHaveBeenCalledWith(
        response.coupon.id,
        {
          occurredAt,
          referenceId: "merchant-order-99",
        },
      ),
    );
    expect(
      await screen.findByText("Confirmed redemption recorded."),
    ).toBeInTheDocument();
    await waitFor(() => expect(api.getCouponInsights).toHaveBeenCalledTimes(2));
  });

  it("does not submit an invalid redemption reference", async () => {
    const user = userEvent.setup();
    renderTable();

    await screen.findByText("Save ten");
    await user.click(screen.getByText("Record confirmed redemption"));
    await user.type(screen.getByLabelText("Reference ID"), "bad reference");

    expect(
      screen.getByRole("button", { name: "Record redemption" }),
    ).toBeDisabled();
    expect(api.recordCouponRedemption).not.toHaveBeenCalled();
  });

  it("shows the real API reason when a redemption cannot be recorded", async () => {
    api.recordCouponRedemption.mockRejectedValueOnce({
      response: {
        data: {
          message: "You do not have permission to record this redemption.",
        },
      },
    });
    const user = userEvent.setup();
    renderTable();

    await screen.findByText("Save ten");
    await user.click(screen.getByText("Record confirmed redemption"));
    await user.type(screen.getByLabelText("Reference ID"), "merchant-order-99");
    await user.click(screen.getByRole("button", { name: "Record redemption" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to record this redemption.",
    );
  });

  it("keeps redemption writes hidden from read-only coupon viewers", async () => {
    permissions.can.mockReturnValue(false);
    permissions.apiRole = "viewer";
    renderTable();

    await screen.findByText("Save ten");

    expect(permissions.can).toHaveBeenCalledWith("coupon:manage");
    expect(
      screen.queryByText("Record confirmed redemption"),
    ).not.toBeInTheDocument();
  });

  it("keeps redemption writes hidden when only the read-only mock API is available", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    renderTable();

    await screen.findByText("Save ten");

    expect(
      screen.queryByText("Record confirmed redemption"),
    ).not.toBeInTheDocument();
    expect(api.recordCouponRedemption).not.toHaveBeenCalled();
  });

  it("shows the producer to an API support operator despite conservative frontend mapping", async () => {
    permissions.can.mockReturnValue(false);
    permissions.apiRole = "support";
    renderTable();

    await screen.findByText("Save ten");

    expect(screen.getByText("Record confirmed redemption")).toBeInTheDocument();
  });
});
