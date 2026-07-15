// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPhoneOtpRecaptcha,
  FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE,
  sendPhoneOtp,
} from "@mobile/auth/firebasePhoneAuth";
import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";

const platformOS = vi.hoisted(() => ({ current: "web" as string }));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return platformOS.current;
    },
  },
}));

const signInWithPhoneNumber = vi.fn();
const recaptchaVerifierCtor = vi.fn();
const recaptchaVerifierClear = vi.fn();

vi.mock("firebase/auth", () => ({
  RecaptchaVerifier: class RecaptchaVerifier {
    clear = recaptchaVerifierClear;
    constructor(...args: unknown[]) {
      recaptchaVerifierCtor(...args);
      const container = args[1];
      if (container instanceof HTMLElement) {
        const badge = document.createElement("div");
        badge.className = "grecaptcha-badge";
        badge.appendChild(document.createElement("iframe"));
        container.appendChild(badge);
      }
    }
  },
  signInWithPhoneNumber: (...args: unknown[]) => signInWithPhoneNumber(...args),
}));

const getClientAuth = vi.fn(() => ({ kind: "auth" }));
const isFirebaseConfigured = vi.fn(() => true);

vi.mock("@mobile/auth/firebaseClient", () => ({
  getClientAuth: () => getClientAuth(),
  isFirebaseConfigured: () => isFirebaseConfigured(),
}));

describe("firebasePhoneAuth > sendPhoneOtp", () => {
  beforeEach(() => {
    clearPhoneOtpRecaptcha();
    platformOS.current = "web";
    signInWithPhoneNumber.mockReset();
    recaptchaVerifierCtor.mockReset();
    recaptchaVerifierClear.mockReset();
    isFirebaseConfigured.mockReturnValue(true);
    signInWithPhoneNumber.mockResolvedValue({ confirm: vi.fn() });
    document.body.innerHTML = "";
  });

  it("given native platform without an application verifier > then throws a clear error", async () => {
    platformOS.current = "android";

    await expect(sendPhoneOtp("+66812345678")).rejects.toThrow(
      FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE,
    );
    expect(signInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it("given native platform with an application verifier > then calls signInWithPhoneNumber with it", async () => {
    platformOS.current = "ios";
    const verifier = { type: "recaptcha", verify: vi.fn() };

    await sendPhoneOtp("+66812345678", verifier);

    expect(signInWithPhoneNumber).toHaveBeenCalledWith(
      getClientAuth(),
      "+66812345678",
      verifier,
    );
  });

  it("given Firebase is not configured > then throws with the not-configured code", async () => {
    platformOS.current = "android";
    isFirebaseConfigured.mockReturnValue(false);
    const verifier = { type: "recaptcha", verify: vi.fn() };

    await expect(sendPhoneOtp("+66812345678", verifier)).rejects.toMatchObject({
      code: FIREBASE_NOT_CONFIGURED_CODE,
    });
  });

  it("given successful web sends > then removes each invisible verifier before returning", async () => {
    platformOS.current = "web";

    await sendPhoneOtp("+66812345678");
    await sendPhoneOtp("+66812345678");

    const container = document.getElementById("gogocash-recaptcha-container");
    expect(container).toBeNull();
    expect(document.querySelector(".grecaptcha-badge")).toBeNull();
    expect(recaptchaVerifierCtor).toHaveBeenCalledTimes(2);
    expect(recaptchaVerifierCtor).toHaveBeenCalledWith(
      getClientAuth(),
      expect.any(HTMLElement),
      { size: "invisible" },
    );
    expect(recaptchaVerifierClear).toHaveBeenCalledTimes(2);
    expect(signInWithPhoneNumber).toHaveBeenCalledTimes(2);
  });

  it("given a failed web send > then removes the verifier badge and owned container", async () => {
    signInWithPhoneNumber.mockRejectedValueOnce(new Error("send failed"));

    await expect(sendPhoneOtp("+66812345678")).rejects.toThrow("send failed");

    expect(recaptchaVerifierClear).toHaveBeenCalledTimes(1);
    expect(document.getElementById("gogocash-recaptcha-container")).toBeNull();
    expect(document.querySelector(".grecaptcha-badge")).toBeNull();
  });

  it("given overlapping sends > then each request owns and clears only its verifier", async () => {
    let resolveFirst!: (value: { confirm: ReturnType<typeof vi.fn> }) => void;
    let resolveSecond!: (value: { confirm: ReturnType<typeof vi.fn> }) => void;
    const firstResult = new Promise<{ confirm: ReturnType<typeof vi.fn> }>(
      (resolve) => {
        resolveFirst = resolve;
      },
    );
    const secondResult = new Promise<{ confirm: ReturnType<typeof vi.fn> }>(
      (resolve) => {
        resolveSecond = resolve;
      },
    );
    signInWithPhoneNumber
      .mockImplementationOnce(() => firstResult)
      .mockImplementationOnce(() => secondResult);

    const firstSend = sendPhoneOtp("+66812345678");
    const secondSend = sendPhoneOtp("+66812345678");

    expect(recaptchaVerifierCtor).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll(".grecaptcha-badge")).toHaveLength(2);

    resolveFirst({ confirm: vi.fn() });
    await firstSend;
    expect(document.querySelectorAll(".grecaptcha-badge")).toHaveLength(1);

    resolveSecond({ confirm: vi.fn() });
    await secondSend;
    expect(document.querySelectorAll(".grecaptcha-badge")).toHaveLength(0);
    expect(recaptchaVerifierClear).toHaveBeenCalledTimes(2);
  });
});

describe("firebasePhoneAuth > confirmPhoneOtp", () => {
  it("given a valid confirmation > then returns the Firebase ID token", async () => {
    const confirm = vi.fn().mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue("firebase-id-token") },
    });

    const { confirmPhoneOtp } = await import("@mobile/auth/firebasePhoneAuth");

    // No cast: confirmPhoneOtp accepts the minimal PhoneOtpConfirmation shape,
    // which both firebase/auth (web) and @react-native-firebase/auth (native)
    // confirmations satisfy structurally.
    await expect(confirmPhoneOtp({ confirm }, "123456")).resolves.toEqual({
      idToken: "firebase-id-token",
    });
    expect(confirm).toHaveBeenCalledWith("123456");
  });

  it("given confirm resolves null (RNFB contract) > then throws a clear error, not a null crash", async () => {
    // @react-native-firebase/auth types confirm() as Promise<UserCredential | null>.
    const confirm = vi.fn().mockResolvedValue(null);

    const { confirmPhoneOtp, PHONE_OTP_NO_CREDENTIAL_MESSAGE } =
      await import("@mobile/auth/firebasePhoneAuth");

    expect(PHONE_OTP_NO_CREDENTIAL_MESSAGE).toBe(
      "Phone sign-in did not return a credential.",
    );
    await expect(confirmPhoneOtp({ confirm }, "123456")).rejects.toThrow(
      "Phone sign-in did not return a credential.",
    );
  });
});

describe("invisible captcha wiring (source signals)", () => {
  it("the auth screen does not mount or preload an always-visible captcha", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const screenSource = readFileSync(
      resolve(__dirname, "../screens/CustomerAuthScreen.tsx"),
      "utf8",
    );

    expect(screenSource).not.toContain("RECAPTCHA_INLINE_CONTAINER_ID");
    expect(screenSource).not.toContain("preloadInlineRecaptcha");
  });
});
