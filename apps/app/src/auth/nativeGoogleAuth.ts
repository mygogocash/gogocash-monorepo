import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { getClientAuth } from "@mobile/auth/firebaseClient";

export class GoogleSignInNotConfiguredError extends Error {
  constructor(message = "Google Sign-In is not configured") {
    super(message);
    this.name = "GoogleSignInNotConfiguredError";
  }
}

function readGoogleWebClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
}

function readGoogleIosClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? "";
}

/**
 * Native Android/iOS Google Sign-In → Firebase JS credential → backend-ready ID token.
 * Dormant until EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set (throws GoogleSignInNotConfiguredError).
 */
export async function signInWithNativeGoogle(): Promise<{ idToken: string }> {
  const webClientId = readGoogleWebClientId();
  if (!webClientId) {
    throw new GoogleSignInNotConfiguredError();
  }

  const iosClientId = readGoogleIosClientId();
  GoogleSignin.configure({
    webClientId,
    ...(iosClientId ? { iosClientId } : {}),
  });

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const googleIdToken =
    response.type === "success" ? response.data.idToken : null;

  if (!googleIdToken) {
    throw new Error("Google Sign-In did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(googleIdToken);
  const result = await signInWithCredential(getClientAuth(), credential);
  return { idToken: await result.user.getIdToken() };
}
