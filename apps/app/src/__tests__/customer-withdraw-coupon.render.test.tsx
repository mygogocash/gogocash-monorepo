import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const backend = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

vi.mock("@mobile/config/env", () => ({
  getMobileEnv: () => ({
    accountDataSource: "backend",
    apiUrl: "https://api.example.com",
  }),
}));

vi.mock("@mobile/api/sharedClient", () => ({
  getSharedMobileApiClient: async () => ({
    get: vi.fn(),
    patch: vi.fn(),
    post: backend.post,
  }),
}));

vi.mock("@mobile/account/customerAccountResource", () => ({
  useCustomerAccountResource: () => ({
    data: {
      fee: { fee_withdraw_thb: 20, minimum_withdraw_thb: 300 },
      netAmount: 3_000,
      netAmountTHB: 3_000,
      totalPayoutTHB: 0,
      totalPayoutUSD: 0,
    },
    status: "ready",
  }),
}));

vi.mock("@mobile/withdraw/usePayoutMethods", () => ({
  usePayoutMethods: () => ({
    findMethodById: vi.fn(),
    methods: [
      {
        accountName: "Ada Lovelace",
        accountNo: "1234567890",
        bankName: "Bangkok Bank",
        id: "bank-1",
        isDefault: true,
        type: "bank",
      },
    ],
    saveMethod: vi.fn(),
    status: "ready",
  }),
}));

vi.mock("@mobile/account/invalidateCustomerWalletQueries", () => ({
  invalidateCustomerWalletQueries: vi.fn().mockResolvedValue(undefined),
}));

import { CustomerMoneyActionScreen } from "@mobile/screens/CustomerMoneyActionScreen";

function renderWithdrawScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerMoneyActionScreen, { mode: "withdraw" }),
    ),
  );
}

describe("CustomerMoneyActionScreen withdraw fee coupon", () => {
  beforeEach(() => {
    backend.post.mockReset();
  });

  it("locks coupon input in flight, renders the authoritative quote, and submits its canonical code", async () => {
    let resolvePreview!: (value: unknown) => void;
    const pendingPreview = new Promise((resolve) => {
      resolvePreview = resolve;
    });
    backend.post.mockImplementation((path: string) => {
      if (path === "/withdraw/preview-fee") return pendingPreview;
      if (path === "/withdraw/bank-transfer") {
        return Promise.resolve({ _id: "withdraw-1", status: "pending" });
      }
      throw new Error(`Unexpected POST ${path}`);
    });

    renderWithdrawScreen();
    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "1000" },
    });
    const couponInput = screen.getByPlaceholderText("Enter coupon code");
    fireEvent.change(couponInput, { target: { value: "save10" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(backend.post).toHaveBeenCalledWith("/withdraw/preview-fee", {
        amount: 1000,
        coupon_code: "SAVE10",
        currency: "THB",
        method: "bank_transfer",
      }),
    );
    expect((couponInput as HTMLInputElement).readOnly).toBe(true);

    await act(async () => {
      resolvePreview({
        available_balance: 3_100,
        base_fee: 42,
        coupon: { code: "SAVE-CANON", name: "Canonical coupon" },
        currency: "THB",
        discount: 17,
        final_fee: 25,
        min_withdraw: 900,
        remaining_cashback: 2_100,
        you_will_receive: 975,
      });
      await pendingPreview;
    });

    expect(await screen.findByText("SAVE-CANON · −17.00 THB")).toBeTruthy();
    expect((couponInput as HTMLInputElement).value).toBe("SAVE-CANON");
    expect(screen.getByText("Minimum withdrawal: 900.00 THB")).toBeTruthy();
    expect(screen.getByText("42.00")).toBeTruthy();
    expect(screen.getByText("25.00 THB")).toBeTruthy();
    expect(screen.getByText("975.00 THB")).toBeTruthy();
    expect(screen.getByText("2,100.00 THB")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Select your bank" }));
    fireEvent.click(screen.getByRole("button", { name: "Bangkok Bank" }));
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    await waitFor(() =>
      expect(backend.post).toHaveBeenCalledWith(
        "/withdraw/bank-transfer",
        expect.objectContaining({ coupon_code: "SAVE-CANON" }),
        expect.objectContaining({ "Idempotency-Key": expect.any(String) }),
      ),
    );
  });

  it("uses the authoritative preview balance for client-side submit gating", async () => {
    backend.post.mockImplementation((path: string) => {
      if (path === "/withdraw/preview-fee") {
        return Promise.resolve({
          available_balance: 900,
          base_fee: 20,
          coupon: { code: "LIMITED", name: "Limited balance" },
          currency: "THB",
          discount: 5,
          final_fee: 15,
          min_withdraw: 300,
          remaining_cashback: 0,
          you_will_receive: 985,
        });
      }
      if (path === "/withdraw/bank-transfer") {
        return Promise.resolve({ _id: "withdraw-1", status: "pending" });
      }
      throw new Error(`Unexpected POST ${path}`);
    });

    renderWithdrawScreen();
    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter coupon code"), {
      target: { value: "limited" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText("LIMITED · −5.00 THB");

    fireEvent.click(screen.getByRole("button", { name: "Select your bank" }));
    fireEvent.click(screen.getByRole("button", { name: "Bangkok Bank" }));
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(
      await screen.findByText(/Insufficient available balance/),
    ).toBeTruthy();
    expect(backend.post).not.toHaveBeenCalledWith(
      "/withdraw/bank-transfer",
      expect.anything(),
      expect.anything(),
    );
  });
});
