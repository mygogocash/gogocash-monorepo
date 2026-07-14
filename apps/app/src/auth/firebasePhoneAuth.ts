import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ApplicationVerifier, ConfirmationResult } from "firebase/auth";
import { Platform } from "react-native";

import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";
import { getClientAuth, isFirebaseConfigured } from "@mobile/auth/firebaseClient";

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

// Phone OTP via Firebase. Web uses the SDK's invisible verifier so normal,
// low-risk users are not forced through an always-visible checkbox. Firebase
// still evaluates every fresh SMS request and may escalate verification when
// risk requires it; native uses its platform ApplicationVerifier.
const RECAPTCHA_CONTAINER_ID = "gogocash-recaptcha-container";

let cachedVerifier: RecaptchaVerifier | null = null;
let cachedContainer: HTMLElement | null = null;

function getInvisibleRecaptcha(): RecaptchaVerifier {
  let container = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = RECAPTCHA_CONTAINER_ID;
    document.body.appendChild(container);
  }
  // A verifier is bound to its container. Reuse the instance while the body
  // container is stable; this avoids iframe churn but never caches a solved
  // token (Firebase resets the verifier after each SMS request).
  if (cachedVerifier && cachedContainer === container) {
    return cachedVerifier;
  }
  cachedVerifier?.clear();
  cachedVerifier = new RecaptchaVerifier(
    getClientAuth(),
    container,
    { size: "invisible" },
  );
  cachedContainer = container;
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
