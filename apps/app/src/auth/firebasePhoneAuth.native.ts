import { getAuth, signInWithPhoneNumber } from "@react-native-firebase/auth";

import {
  confirmPhoneOtpWith,
  sendPhoneOtpWith,
  type PhoneAuthLike,
  type PhoneConfirmationLike,
} from "@mobile/auth/firebasePhoneAuthCore";

// Native phone OTP via @react-native-firebase/auth — Expo's recommended replacement for
// the deprecated expo-firebase-recaptcha. On Android, app verification is SILENT via
// Play Integrity on a real device (no reCAPTCHA webview); the SMS is sent natively.
// Metro resolves this `.native.ts` on device while the web build keeps firebasePhoneAuth.ts
// (DOM reCAPTCHA). Same send/confirm contract, so CustomerAuthScreen's dynamic import
// consumes either identically, and the returned ID token feeds the unchanged
// exchangeFirebaseIdToken → backend flow.

const nativePhoneAuth: PhoneAuthLike = {
  signInWithPhoneNumber: (phoneE164) => signInWithPhoneNumber(getAuth(), phoneE164),
};

/** Sends the OTP SMS. Returns the confirmation handle `confirmPhoneOtp` consumes. */
export function sendPhoneOtp(phoneE164: string): Promise<PhoneConfirmationLike> {
  return sendPhoneOtpWith(nativePhoneAuth, phoneE164);
}

/** Confirms the user's code and returns the auto-refreshing Firebase ID token. */
export function confirmPhoneOtp(
  confirmation: PhoneConfirmationLike,
  code: string
): Promise<{ idToken: string }> {
  return confirmPhoneOtpWith(confirmation, code);
}
