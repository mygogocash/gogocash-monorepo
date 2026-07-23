import type { PhoneOtpConfirmation } from "@mobile/auth/firebasePhoneAuth";

export const NATIVE_PHONE_AUTH_UNAVAILABLE_MESSAGE =
  "Native phone sign-in is unavailable in this build.";

/**
 * Native phone OTP via @react-native-firebase/auth (Play Integrity handles app
 * verification — no reCAPTCHA needed; registered Firebase test numbers work
 * without SMS). The RNFB module is loaded lazily so web bundles and the unit
 * runner never touch the native module, and a binary without it (e.g. an APK
 * built before this feature) fails with a clear message instead of a crash.
 */
export async function sendNativePhoneOtp(phoneE164: string): Promise<PhoneOtpConfirmation> {
  let confirmation: Promise<PhoneOtpConfirmation>;
  try {
    // Both the import and getAuth() fail when the RNFB native module is absent;
    // signInWithPhoneNumber's own (async) auth errors pass through untouched.
    const rnfbAuth = await import("@react-native-firebase/auth");
    confirmation = rnfbAuth.signInWithPhoneNumber(rnfbAuth.getAuth(), phoneE164);
  } catch {
    throw new Error(NATIVE_PHONE_AUTH_UNAVAILABLE_MESSAGE);
  }
  return confirmation;
}
