import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CustomerAgeVerificationScreen,
  isOver20,
} from "@mobile/screens/CustomerAgeVerificationScreen";

// Render coverage for the PDPA age gate. Unlike the source-string suite this MOUNTS
// the screen (react-native -> react-native-web, happy-dom) and drives its REAL
// behavior: a birth-date TextInput + "Verify" button validated by the exported
// isOver20() helper, with a live status message. Asserts the actual rendered copy
// and the empty-input outcome. (The original version of this test asserted an
// invented "Confirm your age" / "I am 20 or older" button UI that does not exist;
// rewritten against the real component.)
describe("isOver20 (exported validator)", () => {
  it("returns false for empty / invalid input", () => {
    expect(isOver20("")).toBe(false);
    expect(isOver20("not-a-date")).toBe(false);
  });

  it("distinguishes under-20 from over-20 against a fixed 'now'", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(isOver20("2010-01-01", now)).toBe(false); // ~16
    expect(isOver20("1990-01-01", now)).toBe(true); // ~36
  });
});

describe("CustomerAgeVerificationScreen (render)", () => {
  it("renders the real PDPA age-gate copy and the Verify control", () => {
    render(createElement(CustomerAgeVerificationScreen));
    // "Age verification" is the topbar + card title
    expect(screen.getAllByText("Age verification").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "To meet PDPA requirements and unlock the full service, enter your birth date below. You must be over 20 years old to continue.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Verify")).toBeTruthy();
    expect(
      screen.getByText(
        "Use your real birth date. Access is available only for users over 20 years old.",
      ),
    ).toBeTruthy();
  });

  it("shows the incomplete-input message when Verify is pressed with no date", () => {
    render(createElement(CustomerAgeVerificationScreen));
    fireEvent.click(screen.getByText("Verify"));
    expect(screen.getByText("Please enter your birth date, then tap Verify.")).toBeTruthy();
  });

  it("mounts without throwing (AccountPageShell + decline Link resolve under the harness)", () => {
    expect(() => render(createElement(CustomerAgeVerificationScreen))).not.toThrow();
  });
});
