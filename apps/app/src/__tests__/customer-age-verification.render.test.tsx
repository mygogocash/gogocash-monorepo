import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { haptics } from "@mobile/lib/haptics";
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
    expect(isOver20("01-01-2010", now)).toBe(false); // ~16
    expect(isOver20("01-01-1990", now)).toBe(true); // ~36
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

// Wave B (B1) per-screen UX adoption: the birth-date form is wrapped in the
// KeyboardAwareScreen primitive so the soft keyboard never covers the focused
// input, and the verify outcome fires a haptic cue (success on pass, error on
// reject/incomplete). These assert the applied affordances without disturbing the
// validation/copy behavior the suite above already pins.
describe("CustomerAgeVerificationScreen (Wave B UX adoption)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps the form in KeyboardAwareScreen (keyboard never covers the input)", () => {
    render(createElement(CustomerAgeVerificationScreen));
    // KeyboardAwareScreen renders its inner ScrollView with this testID.
    expect(screen.getByTestId("keyboard-aware-scroll")).toBeTruthy();
  });

  it("fires a success haptic when a valid over-20 birth date is verified", () => {
    const successSpy = vi.spyOn(haptics, "success").mockResolvedValue();
    const errorSpy = vi.spyOn(haptics, "error").mockResolvedValue();
    render(createElement(CustomerAgeVerificationScreen));

    const input = screen.getByLabelText("Birth date");
    fireEvent.change(input, { target: { value: "1990-01-01" } });
    fireEvent.click(screen.getByText("Verify"));

    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("fires an error haptic when an under-20 birth date is rejected", () => {
    const successSpy = vi.spyOn(haptics, "success").mockResolvedValue();
    const errorSpy = vi.spyOn(haptics, "error").mockResolvedValue();
    render(createElement(CustomerAgeVerificationScreen));

    const input = screen.getByLabelText("Birth date");
    fireEvent.change(input, { target: { value: "2015-01-01" } });
    fireEvent.click(screen.getByText("Verify"));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(successSpy).not.toHaveBeenCalled();
  });

  it("fires an error haptic when Verify is pressed with no birth date", () => {
    const successSpy = vi.spyOn(haptics, "success").mockResolvedValue();
    const errorSpy = vi.spyOn(haptics, "error").mockResolvedValue();
    render(createElement(CustomerAgeVerificationScreen));

    fireEvent.click(screen.getByText("Verify"));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(successSpy).not.toHaveBeenCalled();
  });
});
