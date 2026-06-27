import { authSendErrorMessages } from "@mobile/i18n/toastMessages";

/** OTP-send failures keep the user on the phone step; copy depends on the error kind. */
export type SendErrorKind =
  | "rate-limit"
  | "security-check"
  | "invalid-phone"
  | "not-configured"
  | "generic";

export const sendErrorCopy: Record<SendErrorKind, string> = {
  "rate-limit": authSendErrorMessages.rateLimit,
  "security-check": authSendErrorMessages.securityCheck,
  "invalid-phone": authSendErrorMessages.invalidPhone,
  "not-configured": authSendErrorMessages.notConfigured,
  generic: authSendErrorMessages.generic,
};

export const FIREBASE_NOT_CONFIGURED_CODE = "gogocash/firebase-not-configured";

const SECURITY_CHECK_CODES = new Set([
  "auth/invalid-app-credential",
  "auth/captcha-check-failed",
  "auth/missing-recaptcha-token",
  "auth/unauthorized-domain",
]);

export function toSendErrorKind(error: unknown): SendErrorKind {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "auth/too-many-requests") {
    return "rate-limit";
  }
  if (typeof code === "string" && SECURITY_CHECK_CODES.has(code)) {
    return "security-check";
  }
  if (code === "auth/invalid-phone-number") {
    return "invalid-phone";
  }
  if (code === FIREBASE_NOT_CONFIGURED_CODE) {
    return "not-configured";
  }

  const message = error instanceof Error ? error.message : "";
  if (message.includes("Firebase is not configured")) {
    return "not-configured";
  }

  return "generic";
}
