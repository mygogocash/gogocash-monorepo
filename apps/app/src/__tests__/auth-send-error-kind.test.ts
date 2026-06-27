import { describe, expect, it } from "vitest";

import {
  FIREBASE_NOT_CONFIGURED_CODE,
  sendErrorCopy,
  toSendErrorKind,
} from "@mobile/auth/authSendErrorKind";
import { authSendErrorMessages } from "@mobile/i18n/toastMessages";

function firebaseError(code: string) {
  return Object.assign(new Error(code), { code });
}

describe("toSendErrorKind", () => {
  it("given auth/too-many-requests > then maps to rate-limit", () => {
    expect(toSendErrorKind(firebaseError("auth/too-many-requests"))).toBe("rate-limit");
    expect(sendErrorCopy["rate-limit"]).toBe(authSendErrorMessages.rateLimit);
  });

  it("given reCAPTCHA and domain failures > then maps to security-check", () => {
    for (const code of [
      "auth/invalid-app-credential",
      "auth/captcha-check-failed",
      "auth/missing-recaptcha-token",
      "auth/unauthorized-domain",
    ]) {
      expect(toSendErrorKind(firebaseError(code))).toBe("security-check");
    }
    expect(sendErrorCopy["security-check"]).toBe(authSendErrorMessages.securityCheck);
  });

  it("given auth/invalid-phone-number > then maps to invalid-phone", () => {
    expect(toSendErrorKind(firebaseError("auth/invalid-phone-number"))).toBe("invalid-phone");
    expect(sendErrorCopy["invalid-phone"]).toBe(authSendErrorMessages.invalidPhone);
  });

  it("given Firebase is not configured > then maps to not-configured", () => {
    expect(toSendErrorKind(firebaseError(FIREBASE_NOT_CONFIGURED_CODE))).toBe("not-configured");
    expect(
      toSendErrorKind(new Error("Firebase is not configured — set the EXPO_PUBLIC_FIREBASE_* env values."))
    ).toBe("not-configured");
    expect(sendErrorCopy["not-configured"]).toBe(authSendErrorMessages.notConfigured);
  });

  it("given an unknown error > then maps to generic request-failed copy", () => {
    expect(toSendErrorKind(new Error("network"))).toBe("generic");
    expect(sendErrorCopy.generic).toBe(authSendErrorMessages.generic);
  });
});
