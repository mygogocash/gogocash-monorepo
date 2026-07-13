import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { isOtpCodeError } from "@mobile/auth/authSendErrorKind";
import { translateCopy } from "@mobile/i18n/messages";
import { authSendErrorMessages, toastErrorMessages } from "@mobile/i18n/toastMessages";

// Issue #250: a QA user entered a provably-correct OTP and was told "The
// verification code is incorrect" — a bare catch{} mapped every failure
// (Firebase confirm, backend /auth/log-in exchange, session persist) to the
// same code-blaming copy, with zero logging. Only genuine code errors may
// blame the input; everything else shows the neutral sign-in failure copy and
// records the failing step through the redacting telemetry client.

describe("isOtpCodeError", () => {
  it("given genuine Firebase code errors > then they classify as code errors", () => {
    for (const code of [
      "auth/invalid-verification-code",
      "auth/code-expired",
      "auth/missing-verification-code",
    ]) {
      expect(isOtpCodeError(Object.assign(new Error("bad code"), { code }))).toBe(true);
    }
  });

  it("given non-code failures > then they never blame the entered code", () => {
    expect(
      isOtpCodeError(Object.assign(new Error("net"), { code: "auth/network-request-failed" })),
    ).toBe(false);
    expect(isOtpCodeError(new Error("Login failed with status 503."))).toBe(false);
    expect(isOtpCodeError(null)).toBe(false);
    expect(isOtpCodeError("string error")).toBe(false);
  });
});

describe("OTP failure handling (source signals)", () => {
  const authSource = readFileSync(
    resolve(__dirname, "../screens/CustomerAuthScreen.tsx"),
    "utf8",
  );

  it("the live OTP submit tracks which step failed and logs it via the redacting telemetry client", () => {
    expect(authSource).toContain('step = "exchange"');
    expect(authSource).toContain('step = "persist"');
    expect(authSource).toContain("captureHandledException(");
    expect(authSource).toContain('feature: "phone-otp-login"');
  });

  it("only classified code errors show the code-incorrect copy; other failures show the sign-in failure copy", () => {
    expect(authSource).toContain("isOtpCodeError(");
    expect(authSource).toContain("otpFailure");
    expect(authSource).toContain("toastErrorMessages.signInFailed");
    // The old undifferentiated boolean is gone.
    expect(authSource).not.toContain("setOtpError(");
  });
});

describe("auth failure copy (issues #250/#236)", () => {
  it("the sign-in failure copy resolves to Thai through the existing catalog", () => {
    expect(translateCopy(toastErrorMessages.signInFailed, "th")).not.toBe(
      toastErrorMessages.signInFailed,
    );
  });

  it("the rate-limit copy no longer promises 'a few minutes' and resolves to Thai", () => {
    // Firebase's abuse backoff can last hours (observed 90+ min on staging);
    // the copy must not commit to a short duration we don't control.
    expect(authSendErrorMessages.rateLimit).toBe("Too many attempts. Please try again later.");
    expect(translateCopy(authSendErrorMessages.rateLimit, "th")).not.toBe(
      authSendErrorMessages.rateLimit,
    );
  });
});
