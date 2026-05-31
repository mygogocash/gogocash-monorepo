import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerWithdrawMethodScreen } from "@mobile/screens/CustomerWithdrawMethodScreen";

// Render coverage for the withdrawal-methods screen — an AccountPageShell screen,
// mountable since the harness stubs react-native-safe-area-context (2c4be85).
// Mounts the screen (react-native -> react-native-web, happy-dom) and asserts the
// exact webWithdrawMethodPage fixture content. NOTE: the screen renders bank name +
// masked account in ONE <Text> with a "  ·  " separator and a NESTED <Text> for the
// account tail (screen lines 94-98), so getByText with an exact string fails on
// those — use substring matchers (`{ exact: false }`) for the split nodes.
describe("CustomerWithdrawMethodScreen (render)", () => {
  it("renders the heading and the add-methods control", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("My withdrawal methods")).toBeTruthy();
    expect(screen.getByText("Add Methods")).toBeTruthy();
  });

  it("renders both seeded payout methods' banks (text split by the ' · ' separator)", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("Kasikorn Bank", { exact: false })).toBeTruthy();
    expect(screen.getByText("Bangkok Bank", { exact: false })).toBeTruthy();
  });

  it("renders both masked account tails (nested <Text>)", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("****7890")).toBeTruthy();
    expect(screen.getByText("****3210")).toBeTruthy();
  });

  it("shows the account holder name on both methods", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getAllByText("Demo Shopper").length).toBe(2);
  });

  it("marks the default method with the [Default] badge", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("[Default]")).toBeTruthy();
  });

  it("mounts without throwing (AccountPageShell + safe-area stub resolve)", () => {
    expect(() => render(createElement(CustomerWithdrawMethodScreen))).not.toThrow();
  });
});
