import { createElement, type ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const checkPhoneLoginEligibility = vi.fn();
vi.mock("@mobile/auth/phoneLoginEligibility", () => ({
  checkPhoneLoginEligibility: (...args: unknown[]) =>
    checkPhoneLoginEligibility(...args),
}));

const signInWithSocialProvider = vi.fn();
vi.mock("@mobile/auth/firebaseSocialAuth", () => ({
  isFirebaseSocialProviderId: () => true,
  signInWithSocialProvider: (...args: unknown[]) => signInWithSocialProvider(...args),
}));

const signInWithEmail = vi.fn();
vi.mock("@mobile/auth/emailPasswordAuth", () => ({
  registerWithEmail: vi.fn(),
  signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
}));

// Issue #250: every OTP failure must be logged with the step that failed —
// mock the redacting telemetry client so the assertions can see the calls
// (and keep the real Sentry SDK out of the render suite).
const captureHandledException = vi.fn();
vi.mock("@mobile/observability/client", () => ({
  captureHandledException: (...args: unknown[]) => captureHandledException(...args),
}));

const persistMobileSession = vi.hoisted(() => vi.fn());
vi.mock("@mobile/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mobile/auth/session")>();
  return {
    ...actual,
    persistMobileSession: (...args: unknown[]) => persistMobileSession(...args),
  };
});

import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";
import { mobileSessionStorageKey } from "@mobile/auth/session";

function readStoredSession(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(mobileSessionStorageKey);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

function enterPhoneAndConsent() {
  fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
    target: { value: "0812346789" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "I have read and understand" }));
}

function submitPhone() {
  enterPhoneAndConsent();
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

function advanceResendCountdown() {
  for (let elapsed = 0; elapsed < 59; elapsed += 1) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

function advanceSeconds(seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

function expectButtonDisabled(button: HTMLElement, disabled: boolean) {
  if (disabled) {
    expect(button.getAttribute("aria-disabled")).toBe("true");
    return;
  }

  // React Native Web omits false ARIA attributes instead of serializing
  // `aria-disabled="false"`; enabled means it is anything except true.
  expect(button.getAttribute("aria-disabled")).not.toBe("true");
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
    checkPhoneLoginEligibility.mockReset();
    checkPhoneLoginEligibility.mockResolvedValue(true);
    signInWithSocialProvider.mockReset();
    signInWithEmail.mockReset();
    captureHandledException.mockClear();
    persistMobileSession.mockReset();
    persistMobileSession.mockImplementation(async (session: Record<string, unknown>) => {
      window.localStorage.setItem(mobileSessionStorageKey, JSON.stringify(session));
    });
    sendPhoneOtp.mockResolvedValue({ confirm: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it("backend mode > submitting a valid phone > sends a Firebase OTP to the normalized E164 number and shows the OTP step", async () => {
    render(createElement(CustomerAuthScreen, { mode: "login" }));

    submitPhone();

    // Live mode must request a real OTP (leading trunk 0 stripped for E164)
    // before showing the code-entry step.
    await waitFor(() => {
      expect(checkPhoneLoginEligibility).toHaveBeenCalledWith({
        apiUrl: "https://api-staging.gogocash.co",
        phoneE164: "+66812346789",
      });
      expect(sendPhoneOtp).toHaveBeenCalledWith("+66812346789");
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Verification code")).toBeTruthy();
    });
    // No session may exist yet — the OTP has not been confirmed.
    expect(readStoredSession()).toBeNull();
  });

  it("#325 > login with an unlinked phone > sends no SMS and shows an actionable original-method message", async () => {
    checkPhoneLoginEligibility.mockResolvedValue(false);

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    submitPhone();

    await waitFor(() => {
      expect(
        screen.getByText(
          "We can't sign you in with this phone number. Use the method you used when creating your account, or sign up.",
        ),
      ).toBeTruthy();
    });
    expect(sendPhoneOtp).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Verification code")).toBeNull();
  });

  it("#325 > eligibility request fails > sends no SMS, keeps the phone step, and records the failing step", async () => {
    checkPhoneLoginEligibility.mockRejectedValue(new Error("network unavailable"));

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    submitPhone();

    await waitFor(() => {
      expect(
        screen.getByText("Could not complete your request. Please try again."),
      ).toBeTruthy();
    });
    expect(sendPhoneOtp).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Verification code")).toBeNull();
    expect(captureHandledException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        feature: "phone-otp-login",
        step: "eligibility",
      }),
    );
  });

  it("#325 > eligibility is rate-limited > shows wait guidance and blocks another request", async () => {
    checkPhoneLoginEligibility.mockRejectedValue(
      Object.assign(new Error("rate limited"), {
        code: "auth/too-many-requests",
      }),
    );

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    enterPhoneAndConsent();
    const submitButton = screen.getByRole("button", { name: "Sign in" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Too many attempts. Please try again later.")).toBeTruthy();
    });
    expectButtonDisabled(submitButton, true);
    fireEvent.click(submitButton);
    expect(checkPhoneLoginEligibility).toHaveBeenCalledTimes(1);
    expect(sendPhoneOtp).not.toHaveBeenCalled();
  });

  it("#325 > explicit registration with a new phone > skips eligibility and exchanges the verified token with register intent", async () => {
    checkPhoneLoginEligibility.mockResolvedValue(false);
    const confirmation = { confirm: vi.fn() };
    sendPhoneOtp.mockResolvedValue(confirmation);
    confirmPhoneOtp.mockResolvedValue({ idToken: "new-phone-id-token" });
    exchangeFirebaseIdToken.mockResolvedValue({
      access_token: "new-phone-session",
      provider: "phone",
    });

    render(createElement(CustomerAuthScreen, { mode: "register" }));
    enterPhoneAndConsent();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(sendPhoneOtp).toHaveBeenCalledWith("+66812346789");
    });
    expect(checkPhoneLoginEligibility).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Verification code")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(exchangeFirebaseIdToken).toHaveBeenCalledWith({
        apiUrl: "https://api-staging.gogocash.co",
        country: "TH",
        idToken: "new-phone-id-token",
        intent: "register",
      });
    });
  });

  it("backend mode > while the initial send is in flight > ignores a second submit", async () => {
    let resolveSend!: (confirmation: { confirm: ReturnType<typeof vi.fn> }) => void;
    sendPhoneOtp.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
    );

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    enterPhoneAndConsent();
    const submitButton = screen.getByRole("button", { name: "Sign in" });

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(sendPhoneOtp).toHaveBeenCalledTimes(1);
    });
    expect(checkPhoneLoginEligibility).toHaveBeenCalledTimes(1);
    expectButtonDisabled(submitButton, true);

    await act(async () => {
      resolveSend({ confirm: vi.fn() });
    });
    expect(screen.getByLabelText("Verification code")).toBeTruthy();
  });

  it("backend mode > while the initial send is pending > locks transitions and binds the OTP to the submitted identity", async () => {
    const confirmation = { confirm: vi.fn() };
    let resolveSend!: (value: typeof confirmation) => void;
    sendPhoneOtp.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
    );
    confirmPhoneOtp.mockResolvedValue({ idToken: "firebase-id-token" });
    exchangeFirebaseIdToken.mockResolvedValue({ access_token: "t", provider: "firebase" });

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    enterPhoneAndConsent();
    const phoneInput = screen.getByPlaceholderText("Phone Number");
    const countryButton = screen.getByRole("button", { name: "Shopping in…" });
    const emailSwitch = screen.getByRole("button", { name: "Sign in with email" });
    const socialButton = screen.getByRole("button", { name: "Gmail" });

    // Leave the menu open so a same-tick selection is available after submit.
    fireEvent.click(countryButton);
    const singaporeOption = screen.getByRole("menuitem", { name: "Singapore +65" });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect((phoneInput as HTMLInputElement).readOnly).toBe(true);
    expectButtonDisabled(countryButton, true);
    expectButtonDisabled(singaporeOption, true);
    expectButtonDisabled(emailSwitch, true);
    expectButtonDisabled(socialButton, true);

    // Programmatic events still reach handlers in tests, so ref guards must
    // reject these even before React's disabled state can protect the UI.
    fireEvent.change(phoneInput, { target: { value: "0999999999" } });
    fireEvent.click(singaporeOption);
    fireEvent.click(emailSwitch);
    fireEvent.click(socialButton);

    expect((phoneInput as HTMLInputElement).value).toBe("0812346789");
    expect(screen.queryByLabelText("Email address")).toBeNull();
    expect(signInWithSocialProvider).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(sendPhoneOtp).toHaveBeenCalledWith("+66812346789");
    });

    await act(async () => {
      resolveSend(confirmation);
    });

    expect(screen.getByText("+66 ******6789")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(exchangeFirebaseIdToken).toHaveBeenCalledWith(
        expect.objectContaining({ country: "TH", idToken: "firebase-id-token" }),
      );
    });
  });

  it("backend mode > while social sign-in is pending > blocks a phone send and phone/email edits", async () => {
    let resolveSocial!: (value: { idToken: string }) => void;
    signInWithSocialProvider.mockReturnValue(
      new Promise((resolve) => {
        resolveSocial = resolve;
      }),
    );
    exchangeFirebaseIdToken.mockResolvedValue({ access_token: "social-token" });

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    enterPhoneAndConsent();
    const phoneInput = screen.getByPlaceholderText("Phone Number");
    const submitButton = screen.getByRole("button", { name: "Sign in" });
    const emailSwitch = screen.getByRole("button", { name: "Sign in with email" });
    const socialButton = screen.getByRole("button", { name: "Gmail" });

    fireEvent.click(socialButton);
    await waitFor(() => {
      expect(signInWithSocialProvider).toHaveBeenCalledWith("google");
    });

    expect((phoneInput as HTMLInputElement).readOnly).toBe(true);
    expectButtonDisabled(submitButton, true);
    expectButtonDisabled(emailSwitch, true);
    fireEvent.change(phoneInput, { target: { value: "0999999999" } });
    fireEvent.click(submitButton);
    fireEvent.click(emailSwitch);

    expect((phoneInput as HTMLInputElement).value).toBe("0812346789");
    expect(sendPhoneOtp).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Email address")).toBeNull();

    await act(async () => {
      resolveSocial({ idToken: "social-id-token" });
    });
    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/link-mycashback");
    });
  });

  it("backend mode > while email sign-in is pending > blocks switching back to phone or starting social auth", async () => {
    let resolveEmail!: (value: { idToken: string }) => void;
    signInWithEmail.mockReturnValue(
      new Promise((resolve) => {
        resolveEmail = resolve;
      }),
    );
    exchangeFirebaseIdToken.mockResolvedValue({ access_token: "email-token" });

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "I have read and understand" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith("user@example.com", "password123");
    });
    const phoneSwitch = screen.getByRole("button", { name: "Use phone number instead" });
    const socialButton = screen.getByRole("button", { name: "Gmail" });
    expectButtonDisabled(phoneSwitch, true);
    expectButtonDisabled(socialButton, true);

    fireEvent.click(phoneSwitch);
    fireEvent.click(socialButton);
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Phone Number")).toBeNull();
    expect(signInWithSocialProvider).not.toHaveBeenCalled();

    await act(async () => {
      resolveEmail({ idToken: "email-id-token" });
    });
    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/link-mycashback");
    });
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
        intent: "login",
      });
    });
    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBe("backend-access-token");
    });
    expect(routerReplace).toHaveBeenCalledWith("/link-mycashback");
  });

  it("backend mode > while persistence is pending > blocks change-phone and social transitions until the session finishes", async () => {
    let resolvePersist!: () => void;
    persistMobileSession.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePersist = resolve;
      }),
    );
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
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(persistMobileSession).toHaveBeenCalledTimes(1);
    });
    const changePhoneButton = screen.getByRole("button", { name: "Change phone number" });
    const socialButton = screen.getByRole("button", { name: "Gmail" });
    expectButtonDisabled(changePhoneButton, true);
    expectButtonDisabled(socialButton, true);

    fireEvent.click(changePhoneButton);
    fireEvent.click(socialButton);

    expect(screen.getByLabelText("Verification code")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Phone Number")).toBeNull();
    expect(signInWithSocialProvider).not.toHaveBeenCalled();

    await act(async () => {
      resolvePersist();
    });
    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/link-mycashback");
    });
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

  it("backend mode > given the backend exchange fails > retrying Next reuses the verified ID token", async () => {
    // Issue #250: a correct code failed at the /auth/log-in exchange and the
    // user was told their code was wrong. The exchange step must surface the
    // neutral sign-in failure copy and record which step failed.
    confirmPhoneOtp.mockResolvedValue({ idToken: "firebase-id-token" });
    exchangeFirebaseIdToken
      .mockRejectedValueOnce(new Error("Login failed with status 503."))
      .mockResolvedValueOnce({ access_token: "retried-token", provider: "firebase" });

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

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBe("retried-token");
    });
    expect(confirmPhoneOtp).toHaveBeenCalledTimes(1);
    expect(exchangeFirebaseIdToken).toHaveBeenCalledTimes(2);
    expect(sendPhoneOtp).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith("/link-mycashback");
  });

  it("backend mode > given session persistence fails > retrying Next persists the cached session without reconfirming or re-exchanging", async () => {
    confirmPhoneOtp.mockResolvedValue({ idToken: "firebase-id-token" });
    exchangeFirebaseIdToken.mockResolvedValue({
      access_token: "backend-access-token",
      provider: "firebase",
    });
    persistMobileSession
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockImplementationOnce(async (session: Record<string, unknown>) => {
        window.localStorage.setItem(mobileSessionStorageKey, JSON.stringify(session));
      });

    await reachOtpStepAndSubmit("654321");

    await waitFor(() => {
      expect(screen.getByText("Could not sign in. Please try again.")).toBeTruthy();
    });
    expect(captureHandledException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ feature: "phone-otp-login", step: "persist" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBe("backend-access-token");
    });
    expect(confirmPhoneOtp).toHaveBeenCalledTimes(1);
    expect(exchangeFirebaseIdToken).toHaveBeenCalledTimes(1);
    expect(persistMobileSession).toHaveBeenCalledTimes(2);
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

  it("backend mode > resend waits for the countdown and ignores a second click while sending", async () => {
    vi.useFakeTimers();
    const firstConfirmation = { confirm: vi.fn(), id: "first" };
    const secondConfirmation = { confirm: vi.fn(), id: "second" };
    let resolveResend!: (confirmation: typeof secondConfirmation) => void;
    sendPhoneOtp.mockResolvedValueOnce(firstConfirmation);
    confirmPhoneOtp.mockResolvedValue({ idToken: "firebase-id-token" });
    exchangeFirebaseIdToken.mockResolvedValue({ access_token: "t", provider: "firebase" });

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    submitPhone();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByLabelText("Verification code")).toBeTruthy();

    const resendButton = screen.getByRole("button", { name: "Resend ?" });
    expectButtonDisabled(resendButton, true);
    fireEvent.click(resendButton);
    expect(sendPhoneOtp).toHaveBeenCalledTimes(1);

    advanceResendCountdown();
    expectButtonDisabled(resendButton, false);

    sendPhoneOtp.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveResend = resolve;
      }),
    );
    fireEvent.click(resendButton);
    fireEvent.click(resendButton);

    // A fresh OTP goes to the same normalized number…
    expect(sendPhoneOtp).toHaveBeenCalledTimes(2);
    expectButtonDisabled(resendButton, true);
    expect(sendPhoneOtp).toHaveBeenLastCalledWith("+66812346789");

    await act(async () => {
      resolveResend(secondConfirmation);
    });
    vi.useRealTimers();

    // …and the replacement confirmation is what the next submit verifies against.
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(confirmPhoneOtp).toHaveBeenCalledWith(secondConfirmation, "654321");
    });
  });

  it("backend mode > a rate-limited resend > shows the error on the OTP step and blocks more sends", async () => {
    vi.useFakeTimers();
    sendPhoneOtp
      .mockResolvedValueOnce({ confirm: vi.fn() })
      .mockRejectedValueOnce(
        Object.assign(new Error("blocked"), { code: "auth/too-many-requests" }),
      );

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    submitPhone();
    await act(async () => {
      await Promise.resolve();
    });
    const resendButton = screen.getByRole("button", { name: "Resend ?" });
    advanceResendCountdown();

    fireEvent.click(resendButton);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Too many attempts. Please try again later.")).toBeTruthy();
    expect(screen.getByText("05:00")).toBeTruthy();
    expectButtonDisabled(resendButton, true);
    fireEvent.click(resendButton);
    expect(sendPhoneOtp).toHaveBeenCalledTimes(2);
  });

  it("backend mode > a failed security check on resend > shows a 15 second retry gate", async () => {
    vi.useFakeTimers();
    sendPhoneOtp
      .mockResolvedValueOnce({ confirm: vi.fn(), id: "first" })
      .mockRejectedValueOnce(
        Object.assign(new Error("challenge failed"), {
          code: "auth/captcha-check-failed",
        }),
      )
      .mockResolvedValueOnce({ confirm: vi.fn(), id: "third" });

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    submitPhone();
    await act(async () => {
      await Promise.resolve();
    });
    const resendButton = screen.getByRole("button", { name: "Resend ?" });
    advanceResendCountdown();

    fireEvent.click(resendButton);
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText("Security check failed. Please close and reopen the app, then try again."),
    ).toBeTruthy();
    expect(screen.getByText("00:15")).toBeTruthy();
    expectButtonDisabled(resendButton, true);
    fireEvent.click(resendButton);
    expect(sendPhoneOtp).toHaveBeenCalledTimes(2);

    advanceSeconds(14);
    expect(screen.getByText("00:01")).toBeTruthy();
    expectButtonDisabled(resendButton, true);

    advanceSeconds(1);
    expectButtonDisabled(resendButton, false);
    fireEvent.click(resendButton);
    expect(sendPhoneOtp).toHaveBeenCalledTimes(3);
  });

  it("backend mode > after a verified attempt fails downstream > a fresh resend clears the cached ID token", async () => {
    vi.useFakeTimers();
    const firstConfirmation = { confirm: vi.fn(), id: "first" };
    const secondConfirmation = { confirm: vi.fn(), id: "second" };
    sendPhoneOtp
      .mockResolvedValueOnce(firstConfirmation)
      .mockResolvedValueOnce(secondConfirmation);
    confirmPhoneOtp.mockResolvedValue({ idToken: "firebase-id-token" });
    exchangeFirebaseIdToken
      .mockRejectedValueOnce(new Error("temporary backend failure"))
      .mockResolvedValueOnce({ access_token: "t", provider: "firebase" });

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    submitPhone();
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(confirmPhoneOtp).toHaveBeenCalledTimes(1);

    advanceResendCountdown();
    fireEvent.click(screen.getByRole("button", { name: "Resend ?" }));
    await act(async () => {
      await Promise.resolve();
    });
    vi.useRealTimers();

    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(confirmPhoneOtp).toHaveBeenCalledWith(secondConfirmation, "123123");
    });
    expect(confirmPhoneOtp).toHaveBeenCalledTimes(2);
    expect(sendPhoneOtp).toHaveBeenCalledTimes(2);
  });
});
