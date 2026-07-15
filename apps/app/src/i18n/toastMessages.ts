/**
 * Canonical English strings for user-facing error toasts and inline error UI.
 * Pass through tc() at call sites for locale resolution.
 */
export const toastErrorMessages = {
  generic: "Something went wrong. Please try again.",
  copyFailed: "Could not copy. Please try again.",
  requestFailed: "Could not complete your request. Please try again.",
  submitRequestFailed: "Could not submit your request. Please try again.",
  withdrawalFailed: "Could not complete withdrawal. Please try again.",
  cashbackActivationFailed: "Could not activate cashback. Please try again.",
  signInFailed: "Could not sign in. Please try again.",
  verificationFailed: "Could not complete verification. Please try again.",
  saveEmailFailed: "Could not save your email. Please try again.",
  saveWithdrawalMethodFailed: "Could not save your withdrawal method. Please try again.",
  uploadPhotoFailed: "Could not upload photo. Please try again.",
  saveChoiceFailed: "Could not save your choice. Please try again.",
  saveGoGoTrackSettingsFailed: "Could not save GoGoTrack settings. Please try again.",
  loadCatalogFailed: "Could not load catalog. Please try again.",
} as const;

export type ToastErrorMessage = (typeof toastErrorMessages)[keyof typeof toastErrorMessages];

/** Auth OTP send failures — specific actionable copy outside the Could-not pattern. */
export const authSendErrorMessages = {
  // Firebase's abuse backoff can last hours — never promise a short wait.
  rateLimit: "Too many attempts. Please try again later.",
  securityCheck: "Security check failed. Please close and reopen the app, then try again.",
  invalidPhone: "That phone number doesn't look valid. Check it and try again.",
  unlinkedPhone: "We can't sign you in with this phone number. Use the method you used when creating your account, or sign up.",
  notConfigured: "Sign-in is temporarily unavailable. Please try again later.",
  webOnly: "Social sign-in isn't available in the app yet. Open GoGoCash in your web browser to continue.",
  generic: toastErrorMessages.requestFailed,
} as const;

/** Email/password sign-in failures — see emailPasswordAuth.toEmailAuthErrorKind. */
export const authEmailErrorMessages = {
  // One message for wrong-password AND unknown-user: distinct copy would let
  // an attacker probe which emails have accounts.
  invalidCredentials: "Email or password is incorrect. Check them and try again.",
  emailInUse: "That email already has an account. Sign in instead.",
  weakPassword: "Password must be at least 6 characters.",
  invalidEmail: "That email doesn't look valid. Check it and try again.",
} as const;

/** Approved messages that intentionally break the "Could not … Please try again." pattern. */
export const approvedNonStandardErrorMessages = [
  authSendErrorMessages.rateLimit,
  authSendErrorMessages.securityCheck,
  authSendErrorMessages.invalidPhone,
  authSendErrorMessages.unlinkedPhone,
  authSendErrorMessages.notConfigured,
  authSendErrorMessages.webOnly,
  authEmailErrorMessages.invalidCredentials,
  authEmailErrorMessages.emailInUse,
  authEmailErrorMessages.weakPassword,
  authEmailErrorMessages.invalidEmail,
] as const;

/** Validates a user-facing error string follows the house pattern. */
export function isApprovedUserErrorMessage(message: string): boolean {
  if (message === toastErrorMessages.generic) {
    return true;
  }

  if (
    approvedNonStandardErrorMessages.includes(
      message as (typeof approvedNonStandardErrorMessages)[number],
    )
  ) {
    return true;
  }

  return message.startsWith("Could not ") && message.endsWith(" Please try again.");
}

/** Never surface raw API/provider errors in toast or inline error UI. */
export function userErrorMessageFromUnknown(
  _error: unknown,
  fallback: ToastErrorMessage = toastErrorMessages.generic,
): ToastErrorMessage {
  return fallback;
}
