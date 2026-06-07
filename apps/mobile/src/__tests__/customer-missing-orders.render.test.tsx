import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerMissingOrdersScreen -> AccountPageShell -> CustomerDesktopHeader ->
// CustomerLocaleRegionControl -> i18n/LocaleProvider pulls in expo-localization
// (-> expo-modules-core), which reaches for the native `expo` global that does
// not exist under happy-dom (`__DEV__ is not defined`). Device locale is not the
// behavior under test, so mock the module at the seam — the same pattern the
// customer-auth render test uses.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerMissingOrdersScreen } from "@mobile/screens/CustomerMissingOrdersScreen";

// Wave B (cluster B2) per-screen UX adoption for the missing-order CLAIM form. This is
// the RENDER suite: it MOUNTS the screen (react-native -> react-native-web, happy-dom)
// to prove the long multi-field form still renders after wrapping, AND reads the screen
// source to assert a behavior/source signal for each applied Wave A foundation
// (KeyboardAwareScreen — the keyboard-occlusion fix that matters most on this long form;
// haptics on submit success + validation failure; hitSlop on the small icon-only
// buttons). Skeleton/RefreshControl are intentionally NOT adopted here — this is a form,
// not a data list.
const missingOrdersSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerMissingOrdersScreen.tsx"),
  "utf8"
);

describe("CustomerMissingOrdersScreen (render)", () => {
  it("mounts the claim form without throwing", () => {
    expect(() => render(createElement(CustomerMissingOrdersScreen))).not.toThrow();
    // The page title appears as the top-bar label + the form panel heading.
    expect(screen.getAllByText("Missing Orders").length).toBeGreaterThan(0);
  });

  it("renders the submit action so the keyboard-avoidance wrapper has a real CTA", () => {
    render(createElement(CustomerMissingOrdersScreen));
    expect(screen.getAllByText("Submit claim").length).toBeGreaterThan(0);
  });

  it("FAQ accordion (web parity): first answer open; tapping another question reveals its answer", () => {
    render(createElement(CustomerMissingOrdersScreen));
    // The first FAQ is expanded by default → its answer is visible.
    expect(screen.getByText(/GoGoCash is a cashback platform/)).toBeTruthy();
    // The second FAQ's answer stays hidden until its question is tapped.
    expect(screen.queryByText(/Shop via GoGoCash tracked links/)).toBeNull();
    fireEvent.click(screen.getByText("How to claim cashback?"));
    expect(screen.getByText(/Shop via GoGoCash tracked links/)).toBeTruthy();
  });
});

describe("CustomerMissingOrdersScreen — Wave B foundations adopted (source signals)", () => {
  it("wraps the long form in KeyboardAwareScreen so the keyboard never covers the focused field", () => {
    expect(missingOrdersSource).toContain('from "@mobile/components/KeyboardAwareScreen"');
    expect(missingOrdersSource).toContain("<KeyboardAwareScreen");
  });

  it("imports haptics and fires success on a submitted claim + error on a failed validation", () => {
    expect(missingOrdersSource).toContain('from "@mobile/lib/haptics"');
    expect(missingOrdersSource).toContain("haptics.success(");
    expect(missingOrdersSource).toContain("haptics.error(");
  });

  it("gives the icon-only buttons (<44px) a hitSlop so the tap target reaches 44px", () => {
    // The back-nav chevron and the attachment add-image trigger are icon-only and
    // shorter than 44px; hitSlop expands their tappable area.
    const hitSlopCount = (missingOrdersSource.match(/hitSlop=\{/g) ?? []).length;
    expect(hitSlopCount).toBeGreaterThanOrEqual(2);
  });

  it("aligns to the web design: footer LINE+submit, green pill submit, gradient quick cards, accordion FAQ", () => {
    // The LINE help button moved from the header into a top-bordered footer next to submit.
    expect(missingOrdersSource).toContain("formFooter");
    expect(missingOrdersSource).toContain("borderTopColor: colors.border");
    // Submit is a green pill (rounded-full), not a md-radius rectangle.
    expect(missingOrdersSource).toContain("borderRadius: 999");
    // Quick-card art uses the web's radial mint→white→grey wash.
    expect(missingOrdersSource).toContain("radial-gradient");
    // FAQ is a state-driven accordion (web parity), not a static first-answer.
    expect(missingOrdersSource).toContain("setOpenIndex");
  });
});
