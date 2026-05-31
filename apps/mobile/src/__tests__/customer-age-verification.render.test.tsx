import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CustomerAgeVerificationScreen } from "@mobile/screens/CustomerAgeVerificationScreen";

// Render coverage for the age gate. Unlike the source-string suite this MOUNTS the
// screen (react-native -> react-native-web, happy-dom) and exercises its real
// behavior: confirm writes the age-verified flag to localStorage. Copy is the
// exact webAgeVerificationPage fixture. The decline action is a Link to
// /privacy-policy (expo-router stubbed) and must not throw on mount.
const STORAGE_KEY = "gogocash.ageVerified.v1";

describe("CustomerAgeVerificationScreen (render)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the age-gate copy from the webAgeVerificationPage fixture", () => {
    render(createElement(CustomerAgeVerificationScreen));
    expect(screen.getByText("Confirm your age")).toBeTruthy();
    expect(screen.getByText("GoGoCash is intended for adults.")).toBeTruthy();
    expect(
      screen.getByText(
        "Please confirm you are 20 years or older to continue using GoGoCash and view age-restricted promotions.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("I am 20 or older")).toBeTruthy();
    expect(screen.getByText("I am under 20")).toBeTruthy();
  });

  it("does not mark age-verified until the user confirms", () => {
    render(createElement(CustomerAgeVerificationScreen));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("persists the age-verified flag to localStorage when confirm is pressed", () => {
    render(createElement(CustomerAgeVerificationScreen));
    fireEvent.click(screen.getByText("I am 20 or older"));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  it("mounts without throwing (decline Link + footer slot resolve)", () => {
    expect(() => render(createElement(CustomerAgeVerificationScreen))).not.toThrow();
  });
});
