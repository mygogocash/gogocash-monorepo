import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ApplicationVerifier, ConfirmationResult } from "firebase/auth";
import { Platform } from "react-native";

import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";
import { getClientAuth, isFirebaseConfigured } from "@mobile/auth/firebaseClient";
import { RECAPTCHA_INLINE_CONTAINER_ID } from "@mobile/auth/recaptchaSlot";

export const FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE =
  "Firebase phone sign-in on native requires a reCAPTCHA application verifier.";

export const PHONE_OTP_NO_CREDENTIAL_MESSAGE =
  "Phone sign-in did not return a credential.";

/**
 * Minimal structural contract shared by BOTH phone-auth SDKs: firebase/auth's
 * ConfirmationResult (web) and @react-native-firebase/auth's ConfirmationResult
 * (native, whose confirm() may resolve null). The auth screen and confirmPhoneOtp
 * depend on this shape, not on either SDK's concrete type.
 */
export type PhoneOtpConfirmation = {
  confirm(code: string): Promise<{ user: { getIdToken(): Promise<string> } } | null>;
};

// Phone OTP via Firebase. Web prefers a VISIBLE checkbox rendered in the auth
// card's inline slot (founder 2026-07-13: the invisible badge floated clipped
// at the viewport corner — and rendered Google's domain error there, unreadable).
// The invisible body-appended verifier remains only as a fallback for web entry
// points that don't mount the slot. Native uses expo-firebase-recaptcha's
// ApplicationVerifier from the auth screen.
const RECAPTCHA_CONTAINER_ID = "gogocash-recaptcha-container";

export { RECAPTCHA_INLINE_CONTAINER_ID } from "@mobile/auth/recaptchaSlot";

let cachedVerifier: RecaptchaVerifier | null = null;
let cachedContainer: HTMLElement | null = null;

function getWebRecaptcha(theme?: "dark" | "light"): RecaptchaVerifier {
  const inline = document.getElementById(RECAPTCHA_INLINE_CONTAINER_ID);
  let container = inline;
  if (!container) {
    container = document.getElementById(RECAPTCHA_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = RECAPTCHA_CONTAINER_ID;
      document.body.appendChild(container);
    }
  }
  // A verifier is bound to its container — recreate when the preferred
  // container changed (e.g. the auth card mounted its inline slot).
  if (cachedVerifier && cachedContainer === container) {
    return cachedVerifier;
  }
  cachedVerifier?.clear();
  cachedVerifier = new RecaptchaVerifier(
    getClientAuth(),
    container,
    inline ? { size: "normal", ...(theme ? { theme } : {}) } : { size: "invisible" },
  );
  cachedContainer = container;
  return cachedVerifier;
}

/**
 * Render the visible checkbox as soon as the auth card's phone step mounts so
 * users see the captcha before submitting (instead of it appearing mid-send).
 * Safe no-op off web, when Firebase isn't configured, or without the slot.
 */
export async function preloadInlineRecaptcha(options?: {
  theme?: "dark" | "light";
}): Promise<void> {
  if (!isWebPhoneAuthEnvironment() || !isFirebaseConfigured()) {
    return;
  }
  if (!document.getElementById(RECAPTCHA_INLINE_CONTAINER_ID)) {
    return;
  }
  try {
    await getWebRecaptcha(options?.theme).render();
  } catch {
    // Widget-level failures (e.g. unauthorized domain) now surface INSIDE the
    // visible slot where the admin/user can read them; sending still reports
    // the mapped security-check copy via toSendErrorKind.
  }
}

function isWebPhoneAuthEnvironment(): boolean {
  return Platform.OS === "web" && typeof document !== "undefined";
}

function resolveApplicationVerifier(
  applicationVerifier?: ApplicationVerifier
): ApplicationVerifier {
  if (isWebPhoneAuthEnvironment()) {
    return getWebRecaptcha();
  }
  if (!applicationVerifier) {
    throw new Error(FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE);
  }
  return applicationVerifier;
}

/** Sends the OTP SMS. Returns the confirmation handle `confirmPhoneOtp` consumes. */
export async function sendPhoneOtp(
  phoneE164: string,
  applicationVerifier?: ApplicationVerifier
): Promise<ConfirmationResult> {
  if (!isFirebaseConfigured()) {
    throw Object.assign(new Error("Firebase is not configured"), {
      code: FIREBASE_NOT_CONFIGURED_CODE,
    });
  }

  const verifier = resolveApplicationVerifier(applicationVerifier);

  try {
    return await signInWithPhoneNumber(getClientAuth(), phoneE164, verifier);
  } catch (error) {
    // A consumed/expired verifier cannot be reused — drop it so the next try recreates it.
    if (isWebPhoneAuthEnvironment()) {
      cachedVerifier?.clear();
      cachedVerifier = null;
      cachedContainer = null;
    }
    throw error;
  }
}

/** Confirms the user's code and returns the auto-refreshing Firebase ID token. */
export async function confirmPhoneOtp(
  confirmation: PhoneOtpConfirmation,
  code: string
): Promise<{ idToken: string }> {
  const credential = await confirmation.confirm(code);
  if (!credential) {
    throw new Error(PHONE_OTP_NO_CREDENTIAL_MESSAGE);
  }
  const idToken = await credential.user.getIdToken();
  return { idToken };
}
