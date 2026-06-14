import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Withdraw renders inside AccountPageShell, whose chrome reaches expo-localization (the
// native `expo` global is absent under happy-dom). Device locale is not under test — stub
// it at the seam (same pattern as customer-wallet.render.test.tsx).
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerMoneyActionScreen } from "@mobile/screens/CustomerMoneyActionScreen";

// The Expo /withdraw screen (mode="withdraw") must mirror the web MyWalletWithdraw form step:
// a centered amount with a green underline + "Available Amount", a "Withdrawal Method" + a
// "Select your bank" selector, "Minimum withdrawal" + "Manage Method", and a "Total Withdrawal
// Amount" breakdown (Active Balance / Withdraw Fee / You will receive). CTA is "Withdraw".
describe("CustomerMoneyActionScreen — withdraw web parity (form step)", () => {
  it("withdraw form > renders the web Withdraw page copy + structure", () => {
    render(createElement(CustomerMoneyActionScreen, { mode: "withdraw" }));

    expect(screen.getByText("Withdraw Your Cashback Earnings")).toBeTruthy();
    expect(screen.getByText("Enter Amount to Withdraw")).toBeTruthy();
    expect(screen.getByText(/Available Amount/)).toBeTruthy();
    expect(screen.getByText("Withdrawal Method")).toBeTruthy();
    expect(screen.getAllByText("Bank Transfer").length).toBeGreaterThan(0);
    expect(screen.getByText("Select your bank")).toBeTruthy();
    expect(screen.getByText(/Minimum withdrawal/)).toBeTruthy();
    expect(screen.getByText("Manage Method")).toBeTruthy();
    expect(screen.getByText("Total Withdrawal Amount")).toBeTruthy();
    expect(screen.getByText("Active Balance")).toBeTruthy();
    expect(screen.getByText("Withdraw Fee")).toBeTruthy();
    expect(screen.getByText("You will receive")).toBeTruthy();

    // CTA is the web "Withdraw" (was "Confirm & Dispatch").
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeTruthy();
  });

  it("withdraw form > 'You will receive' reflects the entered amount minus the withdraw fee", () => {
    render(createElement(CustomerMoneyActionScreen, { mode: "withdraw" }));

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "1000" } });

    // Withdraw fee is 20.00 → user receives 980.00 THB.
    expect(screen.getByText("980.00 THB")).toBeTruthy();
  });

  it("withdraw form > given no amount entered > then 'You will receive' shows an em dash, not 0.00", () => {
    render(createElement(CustomerMoneyActionScreen, { mode: "withdraw" }));

    // The empty form must not imply a 0.00 payout before anything is typed.
    expect(screen.getByText("—")).toBeTruthy();
  });
});
