import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerAccountSetupScreen -> CustomerDesktopHeader -> CustomerLocaleRegionControl ->
// i18n/LocaleProvider pulls in expo-localization (-> expo-modules-core), which reaches for
// the native `expo` global that does not exist under happy-dom (`__DEV__ is not defined`).
// Device locale is not the behavior under test, so mock the module at the seam — the same
// pattern customer-auth.render.test.tsx uses.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerAccountSetupScreen } from "@mobile/screens/CustomerAccountSetupScreen";

// Wave B (B2) per-screen UX adoption for the post-signup PromptPay account-setup form. This
// is the RENDER suite: it MOUNTS the screen (react-native -> react-native-web, happy-dom) to
// prove the multi-step form still renders after wrapping it in KeyboardAwareScreen, AND reads
// the screen source to assert a behavior/source signal for each applied Wave A foundation
// (KeyboardAwareScreen around the inputs; haptics.success on a saved method + haptics.error on
// a validation failure). Skeleton/RefreshControl are intentionally NOT adopted here — this is
// a form screen, not a data list. hitSlop is N/A: every Pressable/MotionPressable here is a
// text-labeled control >= 44px (radio cards 56, alt-method cards 88, primary/secondary 48), so
// none needs an expanded tap target.
const setupSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerAccountSetupScreen.tsx"),
  "utf8"
);

describe("CustomerAccountSetupScreen (render)", () => {
  it("mounts the account-setup form without throwing", () => {
    expect(() => render(createElement(CustomerAccountSetupScreen))).not.toThrow();
    // webAccountSetupFlow.sectionTitle is the intro step's section heading (passthrough copy).
    expect(screen.getAllByText("Setup PromptPay as Withdrawal Method").length).toBeGreaterThan(0);
  });

  it("renders the other-phone radio option so the keyboard-aware wrapper has form targets", () => {
    render(createElement(CustomerAccountSetupScreen));
    // webAccountSetupFlow.options.otherPhone is a stable, locale-passthrough radio label.
    expect(screen.getAllByText("Change to other Phone Numbers").length).toBeGreaterThan(0);
  });
});

describe("CustomerAccountSetupScreen — Wave B foundations adopted (source signals)", () => {
  it("wraps the form in KeyboardAwareScreen so the keyboard never covers the focused field", () => {
    expect(setupSource).toContain('from "@mobile/components/KeyboardAwareScreen"');
    expect(setupSource).toContain("<KeyboardAwareScreen");
  });

  it("imports haptics and fires success on a saved method + error on a validation failure", () => {
    expect(setupSource).toContain('from "@mobile/lib/haptics"');
    expect(setupSource).toContain("haptics.success(");
    expect(setupSource).toContain("haptics.error(");
  });
});
