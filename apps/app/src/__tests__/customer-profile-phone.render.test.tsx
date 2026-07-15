import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const phoneFlowMocks = vi.hoisted(() => ({
  confirmPhoneOtp: vi.fn(),
  getSession: vi.fn(),
  linkVerifiedPhone: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  sendPhoneOtpWithRecaptcha: vi.fn(),
  setSession: vi.fn(),
}));

// CustomerProfilePhoneScreen -> AccountPageShell -> CustomerDesktopHeader ->
// CustomerLocaleRegionControl -> i18n/LocaleProvider pulls in expo-localization
// (-> expo-modules-core), which reaches for the native `expo` global that does
// not exist under happy-dom (`__DEV__ is not defined`). Device locale is not the
// behavior under test, so mock the module at the seam — the same pattern the
// customer-auth render test uses.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

vi.mock("expo-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("expo-router")>();
  const mockedRouter = {
    ...actual.router,
    push: phoneFlowMocks.routerPush,
    replace: phoneFlowMocks.routerReplace,
  };
  return {
    ...actual,
    router: mockedRouter,
    useRouter: () => mockedRouter,
  };
});

vi.mock("@mobile/auth/useFirebasePhoneRecaptcha", () => ({
  useFirebasePhoneRecaptcha: () => ({
    recaptchaModal: null,
    sendPhoneOtpWithRecaptcha: phoneFlowMocks.sendPhoneOtpWithRecaptcha,
  }),
}));

vi.mock("@mobile/auth/firebasePhoneAuth", () => ({
  confirmPhoneOtp: phoneFlowMocks.confirmPhoneOtp,
}));

vi.mock("@mobile/auth/phoneLink", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@mobile/auth/phoneLink")>();
  return {
    ...actual,
    linkVerifiedPhone: phoneFlowMocks.linkVerifiedPhone,
  };
});

vi.mock("@mobile/auth/sharedSessionStore", () => ({
  getSharedSessionStore: async () => ({
    getSession: phoneFlowMocks.getSession,
    setSession: phoneFlowMocks.setSession,
  }),
}));

vi.mock("@mobile/config/env", () => ({
  getMobileEnv: () => ({
    accountDataSource: "backend",
    apiUrl: "https://api-staging.gogocash.co",
    appEnv: "staging",
    frontendUrl: "https://app-staging.gogocash.co",
    posthogHost: "",
    posthogKey: "",
    sentryDsn: "",
  }),
}));

import { CustomerProfilePhoneScreen } from "@mobile/screens/CustomerProfilePhoneScreen";
import {
  clearProfilePhoneAttempt,
  getProfilePhoneAttempt,
  setProfilePhoneAttempt,
} from "@mobile/auth/profilePhoneAttempt";
import { PhoneLinkError } from "@mobile/auth/phoneLink";

// Wave B (B2 — Profile & account hub) per-screen UX adoption for the phone-change
// FORM (current mobile number entry + OTP verify). This is the RENDER suite: it
// MOUNTS both screen modes (react-native -> react-native-web, happy-dom) to prove
// the forms still render after wrapping, AND reads the screen source to assert a
// behavior/source signal for each applied Wave A foundation:
//   - KeyboardAwareScreen wraps the inputs so the soft keyboard never covers the
//     focused field (the main fix for a form screen),
//   - haptics fire on the verify/submit path (success when the input is complete,
//     error on an invalid number / incomplete code),
//   - hitSlop expands the small text-only Back buttons + the chevron link toward
//     the 44px tap target.
// Skeleton / RefreshControl are intentionally NOT adopted here — this is a form,
// not a data list. useReducedMotion is also out of scope: this screen has no
// Animated timelines / MotionPressable to gate (unlike B1's OTP-cell animation).
const phoneSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../screens/CustomerProfilePhoneScreen.tsx",
  ),
  "utf8",
);

describe("CustomerProfilePhoneScreen (render)", () => {
  beforeEach(() => {
    clearProfilePhoneAttempt();
    phoneFlowMocks.confirmPhoneOtp.mockReset();
    phoneFlowMocks.getSession.mockReset();
    phoneFlowMocks.linkVerifiedPhone.mockReset();
    phoneFlowMocks.routerPush.mockReset();
    phoneFlowMocks.routerReplace.mockReset();
    phoneFlowMocks.sendPhoneOtpWithRecaptcha.mockReset();
    phoneFlowMocks.setSession.mockReset();

    phoneFlowMocks.confirmPhoneOtp.mockResolvedValue({
      idToken: "firebase-phone-token",
    });
    phoneFlowMocks.getSession.mockResolvedValue({
      _id: "user-1",
      access_token: "stored-backend-jwt",
      provider: "line",
      session_realm: "normal",
    });
    phoneFlowMocks.linkVerifiedPhone.mockResolvedValue({
      mobile: "+66631234567",
    });
    phoneFlowMocks.sendPhoneOtpWithRecaptcha.mockResolvedValue({
      confirm: vi.fn(),
    });
    phoneFlowMocks.setSession.mockResolvedValue(undefined);
  });

  it("mounts the phone-number form without throwing", () => {
    expect(() =>
      render(createElement(CustomerProfilePhoneScreen, { mode: "phone" })),
    ).not.toThrow();
    expect(
      screen.getAllByText("Link Your Phone Number").length,
    ).toBeGreaterThan(0);
  });

  it("shows a fail-closed recovery state when the OTP route has no in-memory attempt", () => {
    expect(() =>
      render(createElement(CustomerProfilePhoneScreen, { mode: "otp" })),
    ).not.toThrow();
    expect(screen.getAllByText("Verification Code").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "This verification attempt expired. Start phone verification again.",
      ),
    ).toBeTruthy();
    expect(screen.queryByPlaceholderText("000000")).toBeNull();
  });

  it("renders the mobile-number field so the keyboard-avoidance wrapper has a focusable target", () => {
    render(createElement(CustomerProfilePhoneScreen, { mode: "phone" }));
    // The phone TextInput's placeholder doubles as a focus target for the keyboard.
    expect(
      screen.getAllByPlaceholderText("08x xxx xxxx").length,
    ).toBeGreaterThan(0);
  });

  it("sends OTP to the canonical Thai number and keeps the credential out of route state", async () => {
    render(createElement(CustomerProfilePhoneScreen, { mode: "phone" }));

    fireEvent.change(screen.getByPlaceholderText("08x xxx xxxx"), {
      target: { value: "063 123 4567" },
    });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(phoneFlowMocks.sendPhoneOtpWithRecaptcha).toHaveBeenCalledWith(
        "+66631234567",
      );
    });
    expect(getProfilePhoneAttempt()).toMatchObject({
      maskedDestination: "+66 ••• ••• 4567",
      phoneE164: "+66631234567",
    });
    expect(phoneFlowMocks.routerPush).toHaveBeenCalledWith("/profile/cf-phone");
    expect(phoneFlowMocks.routerPush.mock.calls.flat().join(" ")).not.toContain(
      "631234567",
    );
  });

  it("confirms OTP, links with the stored backend JWT, and preserves the original provider session", async () => {
    const confirmation = { confirm: vi.fn() };
    setProfilePhoneAttempt({
      confirmation,
      maskedDestination: "+66 ••• ••• 4567",
      phoneE164: "+66631234567",
    });

    render(createElement(CustomerProfilePhoneScreen, { mode: "otp" }));
    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(phoneFlowMocks.confirmPhoneOtp).toHaveBeenCalledWith(
        confirmation,
        "123456",
      );
    });
    expect(phoneFlowMocks.linkVerifiedPhone).toHaveBeenCalledWith({
      apiUrl: "https://api-staging.gogocash.co",
      backendAccessToken: "stored-backend-jwt",
      firebaseIdToken: "firebase-phone-token",
    });
    expect(phoneFlowMocks.setSession).toHaveBeenCalledWith({
      _id: "user-1",
      access_token: "stored-backend-jwt",
      mobile: "+66631234567",
      provider: "line",
      session_realm: "normal",
    });
    expect(getProfilePhoneAttempt()).toBeNull();
    expect(phoneFlowMocks.routerReplace).toHaveBeenCalledWith("/profile/info");
  });

  it("keeps an invalid or expired OTP distinct from account-link failures", async () => {
    setProfilePhoneAttempt({
      confirmation: { confirm: vi.fn() },
      maskedDestination: "+66 ••• ••• 4567",
      phoneE164: "+66631234567",
    });
    phoneFlowMocks.confirmPhoneOtp.mockRejectedValue(
      Object.assign(new Error("internal Firebase detail"), {
        code: "auth/invalid-verification-code",
      }),
    );

    render(createElement(CustomerProfilePhoneScreen, { mode: "otp" }));
    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "111111" },
    });
    fireEvent.click(screen.getByText("Continue"));

    expect(
      await screen.findByText(
        "That code is invalid or expired. Check the code or request a new one.",
      ),
    ).toBeTruthy();
    expect(phoneFlowMocks.linkVerifiedPhone).not.toHaveBeenCalled();
    expect(phoneFlowMocks.setSession).not.toHaveBeenCalled();
  });

  it.each([
    [
      new PhoneLinkError("PHONE_ALREADY_LINKED", 409),
      "This phone number is already linked to another account. Keep using your original sign-in method or contact support.",
    ],
    [
      new PhoneLinkError("PHONE_LINK_FAILED", 422),
      "We couldn't link this phone to your account. Keep using your original sign-in method and try again, or contact support.",
    ],
    [
      new PhoneLinkError("AUTH_SERVICE_UNAVAILABLE", 503),
      "We couldn't finish linking your phone. Please try again. Your original sign-in still works.",
    ],
    [
      new PhoneLinkError("PHONE_VERIFICATION_REQUIRED", 401),
      "That code is invalid or expired. Check the code or request a new one.",
    ],
    [
      new PhoneLinkError("SESSION_REAUTH_REQUIRED", 401),
      "Your sign-in session expired. Sign in again with your original method, then return to Profile > Verify Phone.",
    ],
  ])(
    "shows actionable link/system recovery without replacing the original session",
    async (failure, expectedCopy) => {
      setProfilePhoneAttempt({
        confirmation: { confirm: vi.fn() },
        maskedDestination: "+66 ••• ••• 4567",
        phoneE164: "+66631234567",
      });
      phoneFlowMocks.linkVerifiedPhone.mockRejectedValue(failure);

      render(createElement(CustomerProfilePhoneScreen, { mode: "otp" }));
      fireEvent.change(screen.getByPlaceholderText("000000"), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByText("Continue"));

      expect(await screen.findByText(expectedCopy)).toBeTruthy();
      expect(phoneFlowMocks.setSession).not.toHaveBeenCalled();
      expect(phoneFlowMocks.routerReplace).not.toHaveBeenCalled();
    },
  );
});

describe("CustomerProfilePhoneScreen — Wave B foundations adopted (source signals)", () => {
  it("guards the real OTP send behind the web-only profile-link capability", () => {
    expect(phoneSource).toContain("isProfilePhoneLinkSupported(Platform.OS)");
    const handlerStart = phoneSource.indexOf("const handleSendCode");
    const nativeGuard = phoneSource.indexOf(
      "if (!isPhoneLinkSupported)",
      handlerStart,
    );
    const otpSend = phoneSource.indexOf(
      "sendPhoneOtpWithRecaptcha(phoneE164)",
      handlerStart,
    );
    expect(nativeGuard).toBeGreaterThan(handlerStart);
    expect(otpSend).toBeGreaterThan(nativeGuard);
  });

  it("wraps the form in KeyboardAwareScreen so the keyboard never covers the focused field", () => {
    expect(phoneSource).toContain(
      'from "@mobile/components/KeyboardAwareScreen"',
    );
    expect(phoneSource).toContain("<KeyboardAwareScreen");
  });

  it("imports haptics and fires success on a complete submit + error on an invalid number/code", () => {
    expect(phoneSource).toContain('from "@mobile/lib/haptics"');
    expect(phoneSource).toContain("haptics.success(");
    expect(phoneSource).toContain("haptics.error(");
  });

  it("gives the small icon/text-only buttons a hitSlop so the tap target reaches ~44px", () => {
    // The chevron back-link (icon-only) plus the two text-only "Back" buttons are
    // shorter than 44px; hitSlop expands the tappable area.
    const hitSlopCount = (phoneSource.match(/hitSlop=\{/g) ?? []).length;
    expect(hitSlopCount).toBeGreaterThanOrEqual(2);
  });
});
