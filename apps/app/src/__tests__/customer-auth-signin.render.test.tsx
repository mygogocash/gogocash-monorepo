import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// CustomerDesktopHeader -> locale control pulls in expo-localization (-> expo-modules-core),
// which reaches for a native `expo` global absent under happy-dom. Device locale is not under
// test, so stub it at the seam (same pattern as customer-auth.render.test.tsx).
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

// Neutralize navigation so the OTP "Next" press is a deterministic no-op (we assert on the
// session write, not on routing). The tree uses Link, useRouter, and usePathname.
const routerPush = vi.fn();
const routerReplace = vi.fn();
vi.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
    back: vi.fn(),
    navigate: vi.fn(),
  }),
  usePathname: () => "/login",
  useLocalSearchParams: () => ({}),
}));

import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";
import { mobileSessionStorageKey } from "@mobile/auth/session";

function readStoredSession(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(mobileSessionStorageKey);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

function signInWithDemoOtp() {
  // Phase 1: phone → OTP. Mirrors the existing render harness.
  fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
    target: { value: "0812346789" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "I have read and understand" }));
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

  // Phase 2: enter the demo OTP (123456) and submit.
  fireEvent.change(screen.getByLabelText("Verification code"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

describe("CustomerAuthScreen — phone-OTP sign-in persists a session", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerPush.mockClear();
    routerReplace.mockClear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("sign in > given the valid demo OTP 123456 > then a session with an access_token is written", async () => {
    render(createElement(CustomerAuthScreen, { mode: "login" }));

    signInWithDemoOtp();

    // The auth guard treats a session with a truthy access_token as signed-in. Without this
    // write the app stays on the login screen even though the user "signed in".
    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBeTruthy();
    });
  });

  it("sign in > given the valid demo OTP 123456 > then navigation to the post-login step happens after the session is written", async () => {
    render(createElement(CustomerAuthScreen, { mode: "login" }));

    signInWithDemoOtp();

    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBeTruthy();
    });
    // Navigation is the last step of a verified sign-in.
    expect(routerReplace).toHaveBeenCalledWith("/link-mycashback");
  });
});
