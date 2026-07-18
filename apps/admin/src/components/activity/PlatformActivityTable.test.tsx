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

const activityApi = vi.hoisted(() => ({ listAdminActivity: vi.fn() }));
vi.mock("@/lib/api/activityApi", () => activityApi);

import PlatformActivityTable, {
  PLATFORM_ACTIVITY_ACTION_OPTIONS,
  PLATFORM_ACTIVITY_ENTITY_OPTIONS,
} from "./PlatformActivityTable";

const response = {
  data: [
    {
      _id: "event-1",
      action: "wallet.adjusted",
      actor_id: "admin-1",
      actor_label: "Support Agent",
      actor_type: "admin" as const,
      entity_id: "user-1",
      entity_type: "user",
      metadata: { delta: 100 },
      occurred_at: "2026-07-18T10:30:00.000Z",
      summary: "Wallet adjusted",
    },
  ],
  limit: 25,
  page: 1,
  total: 1,
};

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlatformActivityTable />
    </QueryClientProvider>,
  );
}

describe("PlatformActivityTable", () => {
  beforeEach(() => {
    activityApi.listAdminActivity.mockReset().mockResolvedValue(response);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("catalogs every current backend activity action and entity", () => {
    expect(PLATFORM_ACTIVITY_ACTION_OPTIONS).toEqual(
      expect.arrayContaining([
        "withdraw.approved",
        "withdraw.marked_paid",
        "withdraw.slip_updated",
        "wallet.frozen",
        "wallet.unfrozen",
        "credit_score.config_updated",
        "admin_user.created",
        "admin_user.deleted",
        "admin_user.invited",
        "admin_user.accepted_invite",
        "admin_user.password_reset",
      ]),
    );
    expect(PLATFORM_ACTIVITY_ENTITY_OPTIONS).toContain("credit_score_config");
    expect(PLATFORM_ACTIVITY_ENTITY_OPTIONS).not.toContain("wallet");
  });

  it("exposes metadata expansion as a real disclosure button", async () => {
    const user = userEvent.setup();
    renderTable();

    const disclosure = await screen.findByRole("button", {
      name: "Show metadata for Wallet adjusted",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");

    await user.click(disclosure);

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/"delta": 100/)).toBeInTheDocument();
  });

  it("debounces search and gives React Query's AbortSignal to the request", async () => {
    renderTable();
    await screen.findByText("Support Agent");
    activityApi.listAdminActivity.mockClear();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search activity" }),
      {
        target: { value: "wallet" },
      },
    );
    expect(activityApi.listAdminActivity).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(activityApi.listAdminActivity).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, search: "wallet" }),
        expect.any(AbortSignal),
      ),
    );
  });
});
