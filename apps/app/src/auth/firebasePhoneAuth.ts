import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ApplicationVerifier, ConfirmationResult } from "firebase/auth";
import { Platform } from "react-native";

import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";
import {
  getClientAuth,
  isFirebaseConfigured,
} from "@mobile/auth/firebaseClient";

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
  confirm(
    code: string,
  ): Promise<{ user: { getIdToken(): Promise<string> } } | null>;
};

// Phone OTP via Firebase. Web uses the SDK's invisible verifier so normal,
// low-risk users are not forced through an always-visible checkbox. Firebase
// still evaluates every fresh SMS request and may escalate verification when
// risk requires it; native uses its platform ApplicationVerifier.
const RECAPTCHA_CONTAINER_ID = "gogocash-recaptcha-container";
const RECAPTCHA_PLACEMENT_STYLE_ID = "gogocash-phone-recaptcha-placement";

export type PhoneOtpRecaptchaOwner = object;

type WebRecaptchaHandle = {
  owner: PhoneOtpRecaptchaOwner;
  verifier: RecaptchaVerifier;
  container: HTMLElement;
};

const defaultRecaptchaOwner: PhoneOtpRecaptchaOwner = {};
const activeRecaptchaHandles = new Set<WebRecaptchaHandle>();
let recaptchaContainerSequence = 0;

function ensureRecaptchaPlacementStyle(): void {
  if (document.getElementById(RECAPTCHA_PLACEMENT_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = RECAPTCHA_PLACEMENT_STYLE_ID;
  // Firebase's internal Enterprise verifier has no caller-owned container or
  // badge-position option. Keep its standard badge visible and interactive,
  // but move it above the app's <1024px bottom navigation.
  style.textContent = `
    [data-gogocash-recaptcha="phone-otp"] {
      bottom: 14px;
      position: fixed;
      right: 0;
      z-index: 2147483646;
    }

    @media (max-width: 1023px) {
      [data-gogocash-recaptcha="phone-otp"],
      .grecaptcha-badge[data-style="bottomright"] {
        bottom: calc(104px + env(safe-area-inset-bottom, 0px)) !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function clearWebRecaptchaHandle(handle: WebRecaptchaHandle): void {
  if (!activeRecaptchaHandles.delete(handle)) return;

  try {
    handle.verifier.clear();
  } catch {
    // Cleanup must not turn a successful OTP send into a sign-in failure when
    // the SDK has already destroyed its widget.
  } finally {
    // `badge: "inline"` keeps the visible badge inside this owned container,
    // so removing it cannot disturb another Firebase security challenge.
    handle.container.remove();
  }
}

/** Removes the web-only verifier and its injected badge from the document. */
export function clearPhoneOtpRecaptcha(owner?: PhoneOtpRecaptchaOwner): void {
  for (const handle of [...activeRecaptchaHandles]) {
    if (!owner || handle.owner === owner) {
      clearWebRecaptchaHandle(handle);
    }
  }
}

function createInvisibleRecaptcha(
  owner: PhoneOtpRecaptchaOwner,
): WebRecaptchaHandle {
  ensureRecaptchaPlacementStyle();
  const container = document.createElement("div");
  recaptchaContainerSequence += 1;
  container.id = `${RECAPTCHA_CONTAINER_ID}-${recaptchaContainerSequence}`;
  container.dataset.gogocashRecaptcha = "phone-otp";
  document.body.appendChild(container);

  try {
    const verifier = new RecaptchaVerifier(getClientAuth(), container, {
      badge: "inline",
      size: "invisible",
    });
    const handle = { owner, verifier, container };
    activeRecaptchaHandles.add(handle);
    return handle;
  } catch (error) {
    container.remove();
    throw error;
  }
}

function isWebPhoneAuthEnvironment(): boolean {
  return Platform.OS === "web" && typeof document !== "undefined";
}

function resolveApplicationVerifier(
  applicationVerifier?: ApplicationVerifier,
): ApplicationVerifier {
  if (!applicationVerifier) {
    throw new Error(FIREBASE_NATIVE_RECAPTCHA_REQUIRED_MESSAGE);
  }
  return applicationVerifier;
}

/** Sends the OTP SMS. Returns the confirmation handle `confirmPhoneOtp` consumes. */
export async function sendPhoneOtp(
  phoneE164: string,
  applicationVerifier?: ApplicationVerifier,
  recaptchaOwner: PhoneOtpRecaptchaOwner = defaultRecaptchaOwner,
): Promise<ConfirmationResult> {
  if (!isFirebaseConfigured()) {
    throw Object.assign(new Error("Firebase is not configured"), {
      code: FIREBASE_NOT_CONFIGURED_CODE,
    });
  }

  const webRecaptcha = isWebPhoneAuthEnvironment()
    ? createInvisibleRecaptcha(recaptchaOwner)
    : null;
  const verifier =
    webRecaptcha?.verifier ?? resolveApplicationVerifier(applicationVerifier);

  try {
    return await signInWithPhoneNumber(getClientAuth(), phoneE164, verifier);
  } finally {
    // The confirmation handle no longer needs the application verifier once
    // Firebase has accepted or rejected the SMS request. Recreate on resend.
    if (webRecaptcha) clearWebRecaptchaHandle(webRecaptcha);
  }
}

/** Confirms the user's code and returns the auto-refreshing Firebase ID token. */
export async function confirmPhoneOtp(
  confirmation: PhoneOtpConfirmation,
  code: string,
): Promise<{ idToken: string }> {
  const credential = await confirmation.confirm(code);
  if (!credential) {
    throw new Error(PHONE_OTP_NO_CREDENTIAL_MESSAGE);
  }
  const idToken = await credential.user.getIdToken();
  return { idToken };
}
