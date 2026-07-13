// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE,
  sendPhoneOtp,
} from "@mobile/auth/firebasePhoneAuth";
import {
  preloadInlineRecaptcha,
  RECAPTCHA_INLINE_CONTAINER_ID,
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
const recaptchaVerifierRender = vi.fn();

vi.mock("firebase/auth", () => ({
  RecaptchaVerifier: class RecaptchaVerifier {
    clear = vi.fn();
    render = (...args: unknown[]) => recaptchaVerifierRender(...args);
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
    recaptchaVerifierRender.mockReset();
    recaptchaVerifierRender.mockResolvedValue(0);
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

  it("given the inline card container exists > then renders a VISIBLE (size normal) captcha in it", async () => {
    // Founder 2026-07-13: the invisible badge floated clipped at the viewport
    // corner (and showed Google's tiny domain error there). When the auth card
    // mounts its inline slot, the captcha must be the visible checkbox inside
    // the card — easy to see on both breakpoints.
    platformOS.current = "web";
    const slot = document.createElement("div");
    slot.id = RECAPTCHA_INLINE_CONTAINER_ID;
    document.body.appendChild(slot);

    await sendPhoneOtp("+66812345678");

    expect(recaptchaVerifierCtor).toHaveBeenCalledWith(
      getClientAuth(),
      slot,
      expect.objectContaining({ size: "normal" }),
    );
  });

  it("preloadInlineRecaptcha > given the inline slot > then renders the widget upfront so users see it before submitting", async () => {
    platformOS.current = "web";
    const slot = document.createElement("div");
    slot.id = RECAPTCHA_INLINE_CONTAINER_ID;
    document.body.appendChild(slot);

    await preloadInlineRecaptcha({ theme: "dark" });

    expect(recaptchaVerifierCtor).toHaveBeenCalledWith(
      getClientAuth(),
      slot,
      expect.objectContaining({ size: "normal", theme: "dark" }),
    );
    expect(recaptchaVerifierRender).toHaveBeenCalled();
  });

  it("preloadInlineRecaptcha > given no inline slot or non-web platform > then it is a safe no-op", async () => {
    platformOS.current = "web";
    await preloadInlineRecaptcha({ theme: "light" });
    expect(recaptchaVerifierCtor).not.toHaveBeenCalled();

    platformOS.current = "android";
    const slot = document.createElement("div");
    slot.id = RECAPTCHA_INLINE_CONTAINER_ID;
    document.body.appendChild(slot);
    await preloadInlineRecaptcha({ theme: "light" });
    expect(recaptchaVerifierCtor).not.toHaveBeenCalled();
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

    const { confirmPhoneOtp, PHONE_OTP_NO_CREDENTIAL_MESSAGE } = await import(
      "@mobile/auth/firebasePhoneAuth"
    );

    expect(PHONE_OTP_NO_CREDENTIAL_MESSAGE).toBe(
      "Phone sign-in did not return a credential."
    );
    await expect(confirmPhoneOtp({ confirm }, "123456")).rejects.toThrow(
      "Phone sign-in did not return a credential."
    );
  });
});

describe("visible captcha wiring (source signals)", () => {
  it("the auth screen mounts the inline slot and preloads the visible widget on the phone step", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const screenSource = readFileSync(
      resolve(__dirname, "../screens/CustomerAuthScreen.tsx"),
      "utf8",
    );

    expect(screenSource).toContain("nativeID={RECAPTCHA_INLINE_CONTAINER_ID}");
    expect(screenSource).toContain("preloadInlineRecaptcha({ theme:");
    // Web + live mode only — fixtures/parity and native are untouched.
    expect(screenSource).toContain('liveAuth && Platform.OS === "web"');
  });
});
