// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MissingOrdersManagement from "./MissingOrdersManagement";

const api = vi.hoisted(() => ({
  getMissingOrderDetail: vi.fn(),
  getMissingOrders: vi.fn(),
  getMissingOrderStats: vi.fn(),
  postMissingOrderNote: vi.fn(),
  putMissingOrderApprove: vi.fn(),
  putMissingOrderAssign: vi.fn(),
  putMissingOrderReject: vi.fn(),
}));

vi.mock("@/lib/api/adminModulesApi", () => api);
vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const claim = {
  id: "claim-1",
  userId: "user-1",
  userName: "Claim Seeker",
  email: "seeker@example.com",
  phone: "+66812345678",
  merchantId: "offer-1",
  merchantName: "Example Store",
  offerSource: "involve",
  providerOfferId: 5031,
  orderId: "ORDER-9",
  orderAmount: 100,
  currency: "THB",
  purchaseDate: "2026-07-01T00:00:00.000Z",
  expectedCashback: null,
  overrideCashback: null,
  submittedDate: "2026-07-02T00:00:00.000Z",
  remarks: "Missing conversion",
  status: "pending" as const,
  assignedTo: null,
  evidence: [],
  notes: [],
  resolutionNote: null,
  rejectionReason: null,
  resolvedAt: null,
  schemaVersion: 2,
};

function renderManagement() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MissingOrdersManagement />
    </QueryClientProvider>,
  );
}

describe("MissingOrdersManagement real API states", () => {
  beforeEach(() => {
    api.getMissingOrderStats.mockResolvedValue({
      pendingReview: 1,
      approvedWeek: 0,
      rejectedWeek: 0,
      avgResolutionHours: 6.5,
    });
    api.getMissingOrders.mockResolvedValue({
      data: [claim],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    api.getMissingOrderDetail.mockResolvedValue(claim);
    api.putMissingOrderReject.mockResolvedValue({
      ...claim,
      status: "rejected",
      rejectionReason: "Provider did not confirm order",
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a customer-submitted canonical claim from the API", async () => {
    renderManagement();

    expect(await screen.findByText("ORDER-9")).toBeInTheDocument();
    expect(screen.getByText("Example Store")).toBeInTheDocument();
    expect(screen.getByText("Claim Seeker")).toBeInTheDocument();
    expect(api.getMissingOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      from: undefined,
      to: undefined,
    });
  });

  it("#379 table > shows Username + copyable User ID and Brand + Order ID + purchase date", async () => {
    renderManagement();

    expect(
      await screen.findByRole("columnheader", { name: "User" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Brand" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "ID" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Merchant" }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Claim Seeker")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByTitle("Copy user ID")).toBeInTheDocument();
    expect(screen.getByText("Example Store")).toBeInTheDocument();
    expect(screen.getByText("ORDER-9")).toBeInTheDocument();
    expect(screen.getByTitle("Copy order ID")).toBeInTheDocument();
    // Email/phone move to claim detail — not list columns (#379).
    expect(screen.queryByText("seeker@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("+66812345678")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Copy email")).not.toBeInTheDocument();
  });

  it("#379 table > given phone-only customer > still shows username and user id without inventing email", async () => {
    const phoneOnlyClaim = {
      ...claim,
      userName: "Customer",
      email: null,
      phone: "+66812345678",
    };
    api.getMissingOrders.mockResolvedValue({
      data: [phoneOnlyClaim],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    api.getMissingOrderDetail.mockResolvedValue(phoneOnlyClaim);

    renderManagement();

    expect(await screen.findByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByTitle("Copy user ID")).toBeInTheDocument();
    expect(screen.queryByTitle("Copy email")).not.toBeInTheDocument();
  });

  it("#380 detail > groups fields into User info, Order info, and Adding note frames", async () => {
    api.getMissingOrderDetail.mockResolvedValue({
      ...claim,
      evidence: ["https://public.example.com/missing-orders/receipt.png"],
      notes: [
        {
          adminId: "admin-1",
          adminName: "Ops",
          note: "Looking into provider",
          timestamp: "2026-07-02T12:00:00.000Z",
        },
      ],
    });
    renderManagement();

    fireEvent.click(await screen.findByRole("button", { name: /actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));

    expect(
      await screen.findByRole("heading", { name: "User info" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Order info" }),
    ).toBeInTheDocument();

    const userFrame = screen.getByRole("heading", {
      name: "User info",
    }).parentElement;
    expect(userFrame).toHaveTextContent("Claim Seeker");
    expect(userFrame).toHaveTextContent("seeker@example.com");
    expect(userFrame).toHaveTextContent("+66812345678");
    expect(userFrame).toHaveTextContent("user-1");

    const orderFrame = screen.getByRole("heading", {
      name: "Order info",
    }).parentElement;
    expect(orderFrame).toHaveTextContent("Example Store");
    expect(orderFrame).toHaveTextContent("ORDER-9");
    expect(orderFrame).toHaveTextContent("Missing conversion");
    expect(orderFrame).toHaveTextContent("Looking into provider");
    expect(orderFrame).toHaveTextContent("Proof of purchase");

    // Frame 3 — adding-note controls stay outside Order info.
    expect(
      screen.getByRole("button", { name: "Note from admin" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add note" }),
    ).toBeInTheDocument();
    expect(orderFrame).not.toContainElement(
      screen.getByRole("button", { name: "Add note" }),
    );
  });

  it("keeps an empty result distinct from an API failure", async () => {
    api.getMissingOrders.mockResolvedValue({
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

    renderManagement();

    expect(
      await screen.findByText("No missing conversions."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("surfaces the exact API status and details without fake fallback rows", async () => {
    const failure = {
      status: 503,
      data: { message: "MissionOrder index unavailable" },
    };
    api.getMissingOrderStats.mockRejectedValue(failure);
    api.getMissingOrders.mockRejectedValue(failure);

    renderManagement();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("HTTP 503");
    expect(alert).toHaveTextContent("MissionOrder index unavailable");
    expect(screen.queryByText("ORDER-9")).not.toBeInTheDocument();
  });

  it("requires and persists a rejection reason through the real mutation", async () => {
    renderManagement();

    fireEvent.click(await screen.findByRole("button", { name: /actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Rejection Note" }),
    );
    const rejectButton = screen.getByRole("button", { name: "Reject" });
    expect(rejectButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Rejection note"), {
      target: { value: "Provider did not confirm order" },
    });
    expect(rejectButton).not.toBeDisabled();
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(api.putMissingOrderReject).toHaveBeenCalledWith(
        "claim-1",
        "Provider did not confirm order",
      );
    });
  });

  it("renders evidence only through the authenticated Admin stream", async () => {
    api.getMissingOrderDetail.mockResolvedValue({
      ...claim,
      evidence: ["https://public.example.com/missing-orders/receipt.png"],
    });
    const view = renderManagement();

    fireEvent.click(await screen.findByRole("button", { name: /actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    await screen.findByText("Proof of purchase");

    const image = view.container.querySelector("img");
    expect(image).not.toBeNull();
    expect(image?.getAttribute("src")).toBe(
      "/api/backend/admin/stored-media/stream?ref=https%3A%2F%2Fpublic.example.com%2Fmissing-orders%2Freceipt.png",
    );
  });
});
