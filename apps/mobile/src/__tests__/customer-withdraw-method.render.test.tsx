import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerWithdrawMethodScreen } from "@mobile/screens/CustomerWithdrawMethodScreen";

// Render coverage for the withdrawal-methods screen — an AccountPageShell screen,
// now mountable because the harness stubs react-native-safe-area-context (the shell
// dependency that previously broke the transform). Mounts the screen
// (react-native -> react-native-web, happy-dom) and asserts the exact
// webWithdrawMethodPage fixture content renders: heading, the Add-account control,
// and both seeded payout methods with their bank/account details.
describe("CustomerWithdrawMethodScreen (render)", () => {
  it("renders the heading and the add-account control", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("Withdrawal methods")).toBeTruthy();
    expect(screen.getByText("Add account")).toBeTruthy();
  });

  it("renders both seeded payout methods from the fixture", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("Kasikorn Bank")).toBeTruthy();
    expect(screen.getByText("PromptPay")).toBeTruthy();
    expect(screen.getByText("xxx-x-x4821-x")).toBeTruthy();
    expect(screen.getByText("089-xxx-1234")).toBeTruthy();
  });

  it("shows the account holder name and the Default badge", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    // both fixture methods share the account name + a Default badge
    expect(screen.getAllByText("Napaporn S.").length).toBe(2);
    expect(screen.getAllByText("Default").length).toBeGreaterThan(0);
  });

  it("mounts without throwing (AccountPageShell + safe-area stub resolve)", () => {
    expect(() => render(createElement(CustomerWithdrawMethodScreen))).not.toThrow();
  });
});
