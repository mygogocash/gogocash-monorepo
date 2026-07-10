import { authEmailErrorMessages, authSendErrorMessages } from "@mobile/i18n/toastMessages";

/**
 * Email/password failures keep the user on the email form; copy depends on the
 * kind. Lives apart from emailPasswordAuth.ts so screens can import the copy
 * map statically without pulling firebase/auth into the bundle (same split as
 * authSendErrorKind.ts for the phone flow).
 */
export type EmailAuthErrorKind =
  | "invalid-credentials"
  | "email-in-use"
  | "weak-password"
  | "invalid-email"
  | "rate-limit"
  | "generic";

/** Screen-facing copy per error kind (rate-limit/generic reuse the OTP copy). */
export const emailAuthErrorCopy: Record<EmailAuthErrorKind, string> = {
  "invalid-credentials": authEmailErrorMessages.invalidCredentials,
  "email-in-use": authEmailErrorMessages.emailInUse,
  "weak-password": authEmailErrorMessages.weakPassword,
  "invalid-email": authEmailErrorMessages.invalidEmail,
  "rate-limit": authSendErrorMessages.rateLimit,
  generic: authSendErrorMessages.generic,
};

/**
 * Map Firebase auth errors to screen-facing kinds. Wrong-password and
 * unknown-user deliberately collapse into ONE kind — distinct messages would
 * let an attacker probe which emails have accounts.
 */
export function toEmailAuthErrorKind(error: unknown): EmailAuthErrorKind {
  const code = (error as { code?: unknown } | null)?.code;
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/user-not-found":
      return "invalid-credentials";
    case "auth/email-already-in-use":
      return "email-in-use";
    case "auth/weak-password":
      return "weak-password";
    case "auth/invalid-email":
      return "invalid-email";
    case "auth/too-many-requests":
      return "rate-limit";
    default:
      return "generic";
  }
}
