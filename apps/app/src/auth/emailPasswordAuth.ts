import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";
import { getClientAuth, isFirebaseConfigured } from "@mobile/auth/firebaseClient";

/**
 * Email/password sign-in via the Firebase JS SDK. Unlike phone OTP, no app
 * verifier is involved, so the SAME code path works on web and native RN.
 * Both functions return the Firebase ID token the backend exchange
 * (POST /auth/log-in) consumes — identical to the phone and social flows.
 */

function assertConfigured(): void {
  if (!isFirebaseConfigured()) {
    throw Object.assign(new Error("Firebase is not configured"), {
      code: FIREBASE_NOT_CONFIGURED_CODE,
    });
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ idToken: string }> {
  assertConfigured();
  const credential = await signInWithEmailAndPassword(getClientAuth(), email, password);
  const idToken = await credential.user.getIdToken();
  return { idToken };
}

export async function registerWithEmail(
  email: string,
  password: string
): Promise<{ idToken: string }> {
  assertConfigured();
  const credential = await createUserWithEmailAndPassword(getClientAuth(), email, password);
  const idToken = await credential.user.getIdToken();
  return { idToken };
}
