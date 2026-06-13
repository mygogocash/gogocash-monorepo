/**
 * Local-only phone login shortcut for QA (no SMS, no backend).
 * Enabled when `NODE_ENV === "development"` on both client and server.
 */
export const DEV_PHONE_NEW_USER_LOCAL_DIGITS = "123456789";
export const DEV_PHONE_EXISTING_USER_LOCAL_DIGITS = "321654987";
/** @deprecated Prefer {@link DEV_PHONE_NEW_USER_LOCAL_DIGITS} */
export const DEV_PHONE_LOCAL_DIGITS = DEV_PHONE_NEW_USER_LOCAL_DIGITS;
export const DEV_PHONE_NEW_USER_OTP = "123456";
export const DEV_PHONE_EXISTING_USER_OTP = "321654";
/** @deprecated Prefer {@link DEV_PHONE_NEW_USER_OTP} */
export const DEV_PHONE_OTP = DEV_PHONE_NEW_USER_OTP;
/** Shared secret passed to NextAuth credentials; server accepts only this value in dev. */
export const DEV_PHONE_CREDENTIAL_JWT = "gogocash-dev-phone-mock-jwt";

export function isDevPhoneAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isDevPhoneMagicLocalDigits(digits: string): boolean {
  return (
    digits === DEV_PHONE_NEW_USER_LOCAL_DIGITS || digits === DEV_PHONE_EXISTING_USER_LOCAL_DIGITS
  );
}

/** Expected dev OTP for the given national digits; empty string if not a magic number. */
export function devPhoneMockExpectedOtp(localDigits: string): string {
  if (localDigits === DEV_PHONE_NEW_USER_LOCAL_DIGITS) return DEV_PHONE_NEW_USER_OTP;
  if (localDigits === DEV_PHONE_EXISTING_USER_LOCAL_DIGITS) return DEV_PHONE_EXISTING_USER_OTP;
  return "";
}

/**
 * NextAuth `dev_phone` authorize: national digits are embedded in `mobile_snapshot` (e.g. +66123456789).
 */
export function devPhoneMockIsNewUser(
  mobileSnapshot: string | undefined,
  authFlow: "register" | "login"
): boolean {
  const digits = (mobileSnapshot ?? "").replace(/\D/g, "");
  if (digits.endsWith(DEV_PHONE_NEW_USER_LOCAL_DIGITS)) return true;
  if (digits.endsWith(DEV_PHONE_EXISTING_USER_LOCAL_DIGITS)) return false;
  return authFlow === "register";
}
