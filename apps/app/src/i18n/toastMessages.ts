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
  loadCatalogFailed: "Could not load catalog. Please try again.",
} as const;

export type ToastErrorMessage = (typeof toastErrorMessages)[keyof typeof toastErrorMessages];

/** Auth OTP send failures — specific actionable copy outside the Could-not pattern. */
export const authSendErrorMessages = {
  rateLimit: "Too many attempts. Please wait a few minutes and try again.",
  securityCheck: "Security check failed. Please refresh the page and try again.",
  invalidPhone: "That phone number doesn't look valid. Check it and try again.",
  notConfigured: "Sign-in is temporarily unavailable. Please try again later.",
  generic: toastErrorMessages.requestFailed,
} as const;

/** Approved messages that intentionally break the "Could not … Please try again." pattern. */
export const approvedNonStandardErrorMessages = [
  authSendErrorMessages.rateLimit,
  authSendErrorMessages.securityCheck,
  authSendErrorMessages.invalidPhone,
  authSendErrorMessages.notConfigured,
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
