import { getApps, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { Platform } from "react-native";

// Mirrors the web's src/lib/firebaseClient.ts for the Expo app. Config comes from the
// EXPO_PUBLIC_FIREBASE_* env (inlined by Metro at bundle time) with an expo-constants
// extra fallback — the same resolution order as src/config/env.ts. These are Firebase
// *client* values (they ship in every bundle), not secrets.
type FirebaseClientConfig = {
  apiKey: string;
  appId: string;
  authDomain: string;
  projectId: string;
};

function readExtra(key: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require("expo-constants").default as {
      expoConfig?: { extra?: Record<string, unknown> };
    };
    const value = Constants?.expoConfig?.extra?.[key];
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

export function getFirebaseClientConfig(): FirebaseClientConfig {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || readExtra("firebaseApiKey"),
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || readExtra("firebaseAppId"),
    authDomain:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || readExtra("firebaseAuthDomain"),
    projectId:
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || readExtra("firebaseProjectId"),
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseClientConfig();
  return Boolean(config.apiKey && config.appId && config.projectId && config.authDomain);
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

function getClientApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  const config = getFirebaseClientConfig();
  if (!config.apiKey) {
    throw new Error(
      "Firebase is not configured — set the EXPO_PUBLIC_FIREBASE_* env values."
    );
  }
  cachedApp = initializeApp(config);
  return cachedApp;
}

// Web keeps the auto-refreshing ID token alive across reloads via local persistence
// (parity with the web client). Native uses the SDK's default in-memory persistence
// for now — the backend JWT in the SecureStore session carries signed-in state there.
export function getClientAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }
  const auth = getAuth(getClientApp());
  if (Platform.OS === "web") {
    void setPersistence(auth, browserLocalPersistence).catch(() => {
      // Persistence is best-effort (e.g. private browsing); auth still works in-memory.
    });
  }
  cachedAuth = auth;
  return cachedAuth;
}

// Fresh auto-refreshing Firebase ID token for API calls — the web's axios interceptor
// prefers this over the (never-refreshed) backend JWT; the mobile client will too.
export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  try {
    const user = getClientAuth().currentUser;
    if (!user) {
      return null;
    }
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}
