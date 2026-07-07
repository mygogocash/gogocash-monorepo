import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ApplicationVerifier, ConfirmationResult } from "firebase/auth";
import { Platform } from "react-native";

import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";
import { getClientAuth, isFirebaseConfigured } from "@mobile/auth/firebaseClient";

export const FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE =
  "Firebase phone sign-in on native requires a reCAPTCHA application verifier.";

// Phone OTP via Firebase — the only sign-in provider enabled on gogocash-staging.
// Web uses the invisible DOM RecaptchaVerifier (parity with the Next.js client).
// Native uses expo-firebase-recaptcha's ApplicationVerifier from the auth screen.
const RECAPTCHA_CONTAINER_ID = "gogocash-recaptcha-container";

let cachedVerifier: RecaptchaVerifier | null = null;

function getInvisibleRecaptcha(): RecaptchaVerifier {
  if (cachedVerifier) {
    return cachedVerifier;
  }
  let container = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = RECAPTCHA_CONTAINER_ID;
    document.body.appendChild(container);
  }
  cachedVerifier = new RecaptchaVerifier(getClientAuth(), container, { size: "invisible" });
  return cachedVerifier;
}

function isWebPhoneAuthEnvironment(): boolean {
  return Platform.OS === "web" && typeof document !== "undefined";
}

function resolveApplicationVerifier(
  applicationVerifier?: ApplicationVerifier
): ApplicationVerifier {
  if (isWebPhoneAuthEnvironment()) {
    return getInvisibleRecaptcha();
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
    }
    throw error;
  }
}

/** Confirms the user's code and returns the auto-refreshing Firebase ID token. */
export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  code: string
): Promise<{ idToken: string }> {
  const credential = await confirmation.confirm(code);
  const idToken = await credential.user.getIdToken();
  return { idToken };
}
