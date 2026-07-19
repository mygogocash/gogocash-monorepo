// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { walletAdjustmentEffectHash } from "@/lib/walletAdjustmentCommandStorage";

const adminModulesApi = vi.hoisted(() => ({
  getWalletDetail: vi.fn(),
  postWalletAdjust: vi.fn(),
  putWalletFreeze: vi.fn(),
  putWalletUnfreeze: vi.fn(),
}));

const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/lib/api/adminModulesApi", () => adminModulesApi);
vi.mock("react-hot-toast", () => ({ default: toast }));

import UserWalletPanel from "./UserWalletPanel";

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserWalletPanel userId="user-1" />
    </QueryClientProvider>,
  );
}

async function fillReward() {
  const user = userEvent.setup();
  await screen.findByText("Add extra cashback");
  await user.type(screen.getByPlaceholderText("Amount"), "25");
  await user.selectOptions(screen.getByRole("combobox"), "Reward");
  return user;
}

describe("UserWalletPanel durable adjustment commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    adminModulesApi.getWalletDetail.mockResolvedValue({
      wallet: {
        userId: "user-1",
        userName: "Customer",
        email: "customer@example.com",
        ggcBalance: 0,
        cashbackBalance: 100,
        pointsBalance: 0,
        status: "active",
        lastActivity: "2026-07-18T00:00:00.000Z",
      },
      recentTransactions: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("reuses the durable key after a lost response and panel remount", async () => {
    adminModulesApi.postWalletAdjust
      .mockRejectedValueOnce(new Error("response lost"))
      .mockImplementationOnce(
        async (
          _userId: string,
          effect: {
            type: "credit";
            amount: number;
            currency: "THB";
            reason: string;
          },
          key: string,
        ) => ({
          _id: "adjustment-1",
          idempotency_key: key,
          idempotency_effect_hash: await walletAdjustmentEffectHash(effect),
        }),
      );

    const firstPanel = renderPanel();
    let user = await fillReward();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const firstKey = adminModulesApi.postWalletAdjust.mock.calls[0]?.[2];
    expect(firstKey).toEqual(expect.any(String));
    expect(localStorage.length).toBe(1);

    firstPanel.unmount();
    renderPanel();
    user = await fillReward();
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(adminModulesApi.postWalletAdjust).toHaveBeenCalledTimes(2),
    );
    expect(adminModulesApi.postWalletAdjust.mock.calls[1]?.[2]).toBe(firstKey);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(localStorage.length).toBe(0);
  });

  it("locks all wallet controls while an adjustment is in flight", async () => {
    let resolveRequest!: (response: unknown) => void;
    adminModulesApi.postWalletAdjust.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    renderPanel();
    const user = await fillReward();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(adminModulesApi.postWalletAdjust).toHaveBeenCalledTimes(1),
    );

    expect(screen.getByPlaceholderText("Amount")).toBeDisabled();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(
      screen.getByRole("switch", { name: "Freeze wallet" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    const [, effect, key] = adminModulesApi.postWalletAdjust.mock.calls[0]!;
    resolveRequest({
      _id: "adjustment-1",
      idempotency_key: key,
      idempotency_effect_hash: await walletAdjustmentEffectHash(effect),
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});
