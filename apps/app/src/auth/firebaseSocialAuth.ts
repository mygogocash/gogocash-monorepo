import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type AuthProvider,
} from "firebase/auth";
import { Platform } from "react-native";

import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";
import { getClientAuth, isFirebaseConfigured } from "@mobile/auth/firebaseClient";

export type FirebaseSocialProviderId = "facebook" | "google" | "apple" | "x" | "microsoft";

const FIREBASE_SOCIAL_PROVIDER_IDS: readonly FirebaseSocialProviderId[] = [
  "facebook",
  "google",
  "apple",
  "x",
  "microsoft",
];

export function isFirebaseSocialProviderId(id: string): id is FirebaseSocialProviderId {
  return (FIREBASE_SOCIAL_PROVIDER_IDS as readonly string[]).includes(id);
}

export function createSocialAuthProvider(id: FirebaseSocialProviderId): AuthProvider {
  switch (id) {
    case "google":
      return new GoogleAuthProvider();
    case "facebook":
      return new FacebookAuthProvider();
    case "apple": {
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      return provider;
    }
    case "x":
      return new OAuthProvider("twitter.com");
    case "microsoft": {
      const provider = new OAuthProvider("microsoft.com");
      provider.addScope("email");
      return provider;
    }
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

/** Firebase OAuth popup — Expo web only; native needs provider SDKs (future work). */
export async function signInWithSocialProvider(
  providerId: FirebaseSocialProviderId
): Promise<{ idToken: string }> {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    throw new Error("Firebase social sign-in currently supports Expo web only.");
  }
  if (!isFirebaseConfigured()) {
    throw Object.assign(new Error("Firebase is not configured"), {
      code: FIREBASE_NOT_CONFIGURED_CODE,
    });
  }

  const provider = createSocialAuthProvider(providerId);
  const result = await signInWithPopup(getClientAuth(), provider);
  const idToken = await result.user.getIdToken();
  return { idToken };
}
