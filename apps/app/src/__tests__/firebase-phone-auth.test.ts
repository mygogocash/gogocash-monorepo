// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
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

vi.mock("firebase/auth", () => ({
  RecaptchaVerifier: class RecaptchaVerifier {
    clear = vi.fn();
    constructor(...args: unknown[]) {
      recaptchaVerifierCtor(...args);
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
    platformOS.current = "web";
    signInWithPhoneNumber.mockReset();
    recaptchaVerifierCtor.mockReset();
    isFirebaseConfigured.mockReturnValue(true);
    signInWithPhoneNumber.mockResolvedValue({ confirm: vi.fn() });
    document.body.innerHTML = "";
  });

  it("given native platform without an application verifier > then throws a clear error", async () => {
    platformOS.current = "android";

    await expect(sendPhoneOtp("+66812345678")).rejects.toThrow(
      FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE
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
      verifier
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

  it("given web platform > then uses the invisible DOM RecaptchaVerifier", async () => {
    platformOS.current = "web";

    await sendPhoneOtp("+66812345678");

    expect(signInWithPhoneNumber).toHaveBeenCalled();
    expect(recaptchaVerifierCtor).toHaveBeenCalled();
    expect(document.getElementById("gogocash-recaptcha-container")).toBeTruthy();
  });
});

describe("firebasePhoneAuth > confirmPhoneOtp", () => {
  it("given a valid confirmation > then returns the Firebase ID token", async () => {
    const confirm = vi.fn().mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue("firebase-id-token") },
    });

    const { confirmPhoneOtp } = await import("@mobile/auth/firebasePhoneAuth");

    await expect(
      confirmPhoneOtp({ confirm } as never, "123456")
    ).resolves.toEqual({ idToken: "firebase-id-token" });
    expect(confirm).toHaveBeenCalledWith("123456");
  });
});
