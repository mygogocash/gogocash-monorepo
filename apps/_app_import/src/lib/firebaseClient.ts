import { initializeApp, getApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  TwitterAuthProvider,
  type Auth,
} from "firebase/auth";
import { env } from "@/env";

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

let cachedAuth: Auth | null = null;

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

export function getClientAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("getClientAuth() must run in the browser");
  }

  if (!isFirebaseClientConfigured()) {
    throw new Error(
      "Missing NEXT_PUBLIC_FIREBASE_* env vars. Copy .env.example to .env.local and set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID."
    );
  }

  if (!cachedAuth) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    cachedAuth = getAuth(app);
    // IndexedDB persistence — keeps `currentUser` (and the auto-refreshing
    // ID token) alive across reloads and tab restarts. Failures here are
    // non-fatal: Firebase falls back to in-memory persistence.
    setPersistence(cachedAuth, browserLocalPersistence).catch(() => {});
  }

  return cachedAuth;
}

/** Call from browser only, after env is set — never at module top level (avoids crashing /login on import). */
export const googleProvider = new GoogleAuthProvider();
export const twitterProvider = new TwitterAuthProvider();
