// Platform-agnostic phone-OTP logic shared by the native (@react-native-firebase)
// wire-up. Kept free of native imports so it is node-testable; the real auth object
// and confirmation handle are injected. Mirrors the web path's send/confirm contract
// (firebasePhoneAuth.ts) so CustomerAuthScreen consumes either identically.

export interface PhoneCredentialLike {
  user: { getIdToken(): Promise<string> } | null;
}

export interface PhoneConfirmationLike {
  confirm(code: string): Promise<PhoneCredentialLike | null>;
}

export interface PhoneAuthLike {
  signInWithPhoneNumber(phoneE164: string): Promise<PhoneConfirmationLike>;
}

/** Sends the OTP SMS via the native Firebase SDK and returns the confirmation handle. */
export function sendPhoneOtpWith(
  auth: PhoneAuthLike,
  phoneE164: string
): Promise<PhoneConfirmationLike> {
  return auth.signInWithPhoneNumber(phoneE164);
}

/** Confirms the user's code and returns the auto-refreshing Firebase ID token. */
export async function confirmPhoneOtpWith(
  confirmation: PhoneConfirmationLike,
  code: string
): Promise<{ idToken: string }> {
  const credential = await confirmation.confirm(code);
  if (!credential?.user) {
    throw new Error("Phone confirmation returned no signed-in user.");
  }
  const idToken = await credential.user.getIdToken();
  return { idToken };
}
