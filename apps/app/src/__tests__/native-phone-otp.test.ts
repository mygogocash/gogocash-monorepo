// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuth = vi.fn(() => ({ kind: "rnfb-auth" }));
const signInWithPhoneNumber = vi.fn();
const rnfbModuleState = vi.hoisted(() => ({ available: true }));

vi.mock("@react-native-firebase/auth", () => ({
  getAuth: () => {
    if (!rnfbModuleState.available) {
      // Simulates a binary without the native module (e.g. an APK built
      // before this feature): RNFB throws when resolving the default app.
      throw new Error("Native module RNFBAppModule not found");
    }
    return getAuth();
  },
  signInWithPhoneNumber: (...args: unknown[]) => signInWithPhoneNumber(...args),
}));

describe("nativePhoneAuth > sendNativePhoneOtp", () => {
  beforeEach(() => {
    vi.resetModules();
    rnfbModuleState.available = true;
    getAuth.mockClear();
    signInWithPhoneNumber.mockReset();
  });

  it("given the RNFB module is present > then delegates to modular signInWithPhoneNumber", async () => {
    const confirmation = { confirm: vi.fn() };
    signInWithPhoneNumber.mockResolvedValue(confirmation);

    const { sendNativePhoneOtp } = await import("@mobile/auth/nativePhoneAuth");

    await expect(sendNativePhoneOtp("+66999999999")).resolves.toBe(confirmation);
    expect(signInWithPhoneNumber).toHaveBeenCalledWith(
      { kind: "rnfb-auth" },
      "+66999999999"
    );
  });

  it("given the RNFB native module is missing > then throws the clear unavailable message", async () => {
    rnfbModuleState.available = false;

    const { sendNativePhoneOtp, NATIVE_PHONE_AUTH_UNAVAILABLE_MESSAGE } = await import(
      "@mobile/auth/nativePhoneAuth"
    );

    expect(NATIVE_PHONE_AUTH_UNAVAILABLE_MESSAGE).toBe(
      "Native phone sign-in is unavailable in this build."
    );
    await expect(sendNativePhoneOtp("+66999999999")).rejects.toThrow(
      "Native phone sign-in is unavailable in this build."
    );
  });
});

describe("useFirebasePhoneRecaptcha (native)", () => {
  beforeEach(() => {
    vi.resetModules();
    rnfbModuleState.available = true;
    signInWithPhoneNumber.mockReset();
  });

  it("given a phone number > then sends the OTP through the RNFB wrapper (no verifier needed)", async () => {
    const confirmation = { confirm: vi.fn() };
    signInWithPhoneNumber.mockResolvedValue(confirmation);

    const { useFirebasePhoneRecaptcha } = await import(
      "@mobile/auth/useFirebasePhoneRecaptcha.native"
    );
    const { result } = renderHook(() => useFirebasePhoneRecaptcha());

    await expect(
      result.current.sendPhoneOtpWithRecaptcha("+66999999999")
    ).resolves.toBe(confirmation);
    expect(result.current.recaptchaModal).toBeNull();
  });
});
