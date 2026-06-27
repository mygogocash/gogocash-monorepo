import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { Platform } from "react-native";

import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";
import { getClientAuth, isFirebaseConfigured } from "@mobile/auth/firebaseClient";

// Phone OTP via Firebase — the only sign-in provider enabled on gogocash-staging.
// Mirrors the web's src/features/profile/firebase/fc.ts: invisible reCAPTCHA +
// signInWithPhoneNumber. RecaptchaVerifier needs a DOM, so this path is Expo-web only;
// native needs expo-firebase-recaptcha or a dev-client build (future work).
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

/** Sends the OTP SMS. Returns the confirmation handle `confirmPhoneOtp` consumes. */
export async function sendPhoneOtp(phoneE164: string): Promise<ConfirmationResult> {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    throw new Error("Firebase phone sign-in currently supports Expo web only.");
  }
  if (!isFirebaseConfigured()) {
    throw Object.assign(new Error("Firebase is not configured"), {
      code: FIREBASE_NOT_CONFIGURED_CODE,
    });
  }
  try {
    return await signInWithPhoneNumber(getClientAuth(), phoneE164, getInvisibleRecaptcha());
  } catch (error) {
    // A consumed/expired verifier cannot be reused — drop it so the next try recreates it.
    cachedVerifier?.clear();
    cachedVerifier = null;
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
