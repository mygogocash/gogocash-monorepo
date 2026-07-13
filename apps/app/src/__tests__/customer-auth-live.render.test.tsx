import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Same seam stubs as customer-auth-signin.render.test.tsx: device locale and
// navigation are not under test here.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

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

// Firebase plumbing seams — the live branch dynamic-imports these modules, so the
// mocks keep the real `firebase` package out of the render suite entirely.
const sendPhoneOtp = vi.fn();
const confirmPhoneOtp = vi.fn();
vi.mock("@mobile/auth/firebasePhoneAuth", () => ({
  sendPhoneOtp: (...args: unknown[]) => sendPhoneOtp(...args),
  confirmPhoneOtp: (...args: unknown[]) => confirmPhoneOtp(...args),
}));

const exchangeFirebaseIdToken = vi.fn();
vi.mock("@mobile/auth/firebaseLogin", () => ({
  exchangeFirebaseIdToken: (...args: unknown[]) => exchangeFirebaseIdToken(...args),
}));

// Issue #250: every OTP failure must be logged with the step that failed —
// mock the redacting telemetry client so the assertions can see the calls
// (and keep the real Sentry SDK out of the render suite).
const captureHandledException = vi.fn();
vi.mock("@mobile/observability/client", () => ({
  captureHandledException: (...args: unknown[]) => captureHandledException(...args),
}));

import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";
import { mobileSessionStorageKey } from "@mobile/auth/session";

function readStoredSession(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(mobileSessionStorageKey);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

function submitPhone() {
  fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
    target: { value: "0812346789" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "I have read and understand" }));
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("CustomerAuthScreen — backend mode uses the real Firebase phone flow", () => {
  beforeEach(() => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api-staging.gogocash.co");
    window.localStorage.clear();
    routerPush.mockClear();
    routerReplace.mockClear();
    sendPhoneOtp.mockReset();
    confirmPhoneOtp.mockReset();
    exchangeFirebaseIdToken.mockReset();
    captureHandledException.mockClear();
    sendPhoneOtp.mockResolvedValue({ confirm: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it("backend mode > submitting a valid phone > sends a Firebase OTP to the normalized E164 number and shows the OTP step", async () => {
    render(createElement(CustomerAuthScreen, { mode: "login" }));

    submitPhone();

    // Live mode must request a real OTP (leading trunk 0 stripped for E164)
    // before showing the code-entry step.
    await waitFor(() => {
      expect(sendPhoneOtp).toHaveBeenCalledWith("+66812346789");
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Verification code")).toBeTruthy();
    });
    // No session may exist yet — the OTP has not been confirmed.
    expect(readStoredSession()).toBeNull();
  });

  it("backend mode > submitting the received code > confirms it, exchanges the Firebase token, persists the session, and navigates", async () => {
    const confirmation = { confirm: vi.fn() };
    sendPhoneOtp.mockResolvedValue(confirmation);
    confirmPhoneOtp.mockResolvedValue({ idToken: "firebase-id-token" });
    exchangeFirebaseIdToken.mockResolvedValue({
      access_token: "backend-access-token",
      provider: "firebase",
    });

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    submitPhone();
    await waitFor(() => {
      expect(screen.getByLabelText("Verification code")).toBeTruthy();
    });

    // A real OTP is whatever Firebase sent — deliberately NOT 123456. Typing it
    // must not flash the demo-stub error.
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "654321" },
    });
    expect(screen.queryByText(/verification code is incorrect/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(confirmPhoneOtp).toHaveBeenCalledWith(confirmation, "654321");
    });
    await waitFor(() => {
      expect(exchangeFirebaseIdToken).toHaveBeenCalledWith({
        apiUrl: "https://api-staging.gogocash.co",
        country: "TH",
        idToken: "firebase-id-token",
      });
    });
    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBe("backend-access-token");
    });
    expect(routerReplace).toHaveBeenCalledWith("/link-mycashback");
  });

  async function reachOtpStepAndSubmit(code: string) {
    render(createElement(CustomerAuthScreen, { mode: "login" }));
    submitPhone();
    await waitFor(() => {
      expect(screen.getByLabelText("Verification code")).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: code },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
  }

  it("backend mode > given Firebase rejects the code > shows the OTP error, persists nothing, does not navigate", async () => {
    confirmPhoneOtp.mockRejectedValue(
      Object.assign(new Error("invalid"), { code: "auth/invalid-verification-code" })
    );

    await reachOtpStepAndSubmit("999999");

    await waitFor(() => {
      expect(screen.getByText(/verification code is incorrect/i)).toBeTruthy();
    });
    expect(exchangeFirebaseIdToken).not.toHaveBeenCalled();
    expect(readStoredSession()).toBeNull();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("backend mode > given the backend exchange fails > shows the sign-in failure copy (never 'code incorrect') and logs the step", async () => {
    // Issue #250: a correct code failed at the /auth/log-in exchange and the
    // user was told their code was wrong. The exchange step must surface the
    // neutral sign-in failure copy and record which step failed.
    confirmPhoneOtp.mockResolvedValue({ idToken: "firebase-id-token" });
    exchangeFirebaseIdToken.mockRejectedValue(new Error("Login failed with status 503."));

    await reachOtpStepAndSubmit("654321");

    await waitFor(() => {
      expect(screen.getByText("Could not sign in. Please try again.")).toBeTruthy();
    });
    expect(screen.queryByText(/verification code is incorrect/i)).toBeNull();
    expect(captureHandledException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ feature: "phone-otp-login", step: "exchange" }),
    );
    expect(readStoredSession()).toBeNull();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("backend mode > given confirm fails for a non-code reason (network) > shows the sign-in failure copy, not 'code incorrect'", async () => {
    confirmPhoneOtp.mockRejectedValue(
      Object.assign(new Error("network down"), { code: "auth/network-request-failed" }),
    );

    await reachOtpStepAndSubmit("654321");

    await waitFor(() => {
      expect(screen.getByText("Could not sign in. Please try again.")).toBeTruthy();
    });
    expect(screen.queryByText(/verification code is incorrect/i)).toBeNull();
    expect(captureHandledException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ feature: "phone-otp-login", step: "confirm" }),
    );
    expect(readStoredSession()).toBeNull();
  });

  it("backend mode > pressing resend > requests a fresh OTP and the next submit confirms against the new confirmation", async () => {
    const firstConfirmation = { confirm: vi.fn(), id: "first" };
    const secondConfirmation = { confirm: vi.fn(), id: "second" };
    sendPhoneOtp
      .mockResolvedValueOnce(firstConfirmation)
      .mockResolvedValueOnce(secondConfirmation);
    confirmPhoneOtp.mockResolvedValue({ idToken: "firebase-id-token" });
    exchangeFirebaseIdToken.mockResolvedValue({ access_token: "t", provider: "firebase" });

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    submitPhone();
    await waitFor(() => {
      expect(screen.getByLabelText("Verification code")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Resend ?"));

    // A fresh OTP goes to the same normalized number…
    await waitFor(() => {
      expect(sendPhoneOtp).toHaveBeenCalledTimes(2);
    });
    expect(sendPhoneOtp).toHaveBeenLastCalledWith("+66812346789");

    // …and the replacement confirmation is what the next submit verifies against.
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(confirmPhoneOtp).toHaveBeenCalledWith(secondConfirmation, "654321");
    });
  });
});
