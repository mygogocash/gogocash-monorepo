import { createElement, type ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@mobile/components/Toast";
import { haptics } from "@mobile/lib/haptics";
import {
  CustomerProfileDetailScreen,
  isValidBirthdate,
  isValidPassportId,
} from "@mobile/screens/CustomerProfileDetailScreen";

// Wave 3: the info screen now mounts the shared ProfileInfoPanel -> ProfileHeroCard,
// whose copy buttons call useToast() and therefore need a ToastProvider in the tree
// (same provider AppProviders supplies in the real app). Wrap every mount here.
function renderInfoScreen(element: ReactElement) {
  return render(createElement(ToastProvider, {}, element));
}

// Bug-hunt fixes for CustomerProfileDetailScreen identity validation:
//  #6 — passport was length-only (accepted "#@!ABC1") despite the "alphanumeric" message.
//  #7 — birthdate was format-only (accepted "2026-13-45" and future dates).

describe("isValidPassportId", () => {
  it("accepts 7–15 alphanumeric characters", () => {
    expect(isValidPassportId("AB1234567")).toBe(true);
    expect(isValidPassportId("A234567")).toBe(true); // 7
    expect(isValidPassportId("A23456789012345")).toBe(true); // 15
  });

  it("rejects non-alphanumeric characters", () => {
    expect(isValidPassportId("#@!ABC1")).toBe(false);
    expect(isValidPassportId("ABC 1234")).toBe(false);
  });

  it("rejects too-short / too-long", () => {
    expect(isValidPassportId("ABC123")).toBe(false); // 6
    expect(isValidPassportId("A234567890123456")).toBe(false); // 16
    expect(isValidPassportId("   ")).toBe(false);
  });
});

describe("isValidBirthdate", () => {
  const now = new Date("2026-06-02T00:00:00Z");

  it("accepts a real past date in YYYY-MM-DD", () => {
    expect(isValidBirthdate("1990-01-01", now)).toBe(true);
  });

  it("rejects malformed format", () => {
    expect(isValidBirthdate("not-a-date", now)).toBe(false);
    expect(isValidBirthdate("1990-1-1", now)).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidBirthdate("2026-13-45", now)).toBe(false);
    expect(isValidBirthdate("2000-02-30", now)).toBe(false);
  });

  it("rejects future dates", () => {
    expect(isValidBirthdate("2999-01-01", now)).toBe(false);
  });
});

// Wave B (B2) — per-screen UX adoption for the profile-EDIT form. These cover the
// native-mobile affordances added on top of the existing validators (no new visible
// copy): the form is wrapped in KeyboardAwareScreen so the keyboard never covers the
// focused field, and a save fires a haptic on the same branch the validators already
// gate — haptics.success on a clean save, haptics.error on a validation rejection.
describe("CustomerProfileDetailScreen (info edit form) — UX adoption", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps the edit form in KeyboardAwareScreen (keyboard-aware scroll present)", () => {
    renderInfoScreen(createElement(CustomerProfileDetailScreen, { mode: "info" }));
    // KeyboardAwareScreen tags its inner ScrollView with this stable testID;
    // under the render harness react-native -> react-native-web, so the testID
    // surfaces as a data-testid on the rendered node.
    expect(screen.getByTestId("keyboard-aware-scroll")).toBeTruthy();
  });

  // The web-parity ProfileInfoPanel renders a BLANK form (placeholder-only inputs), so a
  // clean save requires filling every required field — National ID (13 digits), Legal
  // Address (>= 10 chars), Zip Code (5 digits), and a valid past Birthdate. Username
  // defaults to the session value ("Mock User", already >= 3 chars).
  function enterEditAndFillValid() {
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getByPlaceholderText("Citizen or Passport ID"), {
      target: { value: "1234567890123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Legal Address"), {
      target: { value: "123 Example Road, Bangkok" },
    });
    fireEvent.change(screen.getByPlaceholderText("Zip Code"), {
      target: { value: "10110" },
    });
    fireEvent.change(screen.getByPlaceholderText("YYYY-MM-DD"), {
      target: { value: "1990-01-01" },
    });
  }

  it("fires haptics.success on a clean save (all required fields valid)", () => {
    const successSpy = vi.spyOn(haptics, "success").mockResolvedValue();
    const errorSpy = vi.spyOn(haptics, "error").mockResolvedValue();
    renderInfoScreen(createElement(CustomerProfileDetailScreen, { mode: "info" }));

    enterEditAndFillValid();
    fireEvent.click(screen.getByText("Save"));

    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("fires haptics.error on a validation rejection (cleared username, all else valid)", () => {
    const successSpy = vi.spyOn(haptics, "success").mockResolvedValue();
    const errorSpy = vi.spyOn(haptics, "error").mockResolvedValue();
    renderInfoScreen(createElement(CustomerProfileDetailScreen, { mode: "info" }));

    enterEditAndFillValid();
    // Clear the name field (defaults to the session "Mock User") -> trips the
    // "at least 3 characters" rejection while every other field stays valid.
    fireEvent.change(screen.getByDisplayValue("Mock User"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByText("Save"));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(successSpy).not.toHaveBeenCalled();
  });
});
