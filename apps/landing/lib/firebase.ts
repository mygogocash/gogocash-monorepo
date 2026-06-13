import {
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import {
  publicFirebaseConfig,
  publicFirebaseMeasurementId,
} from "@/lib/app-config";

/** GA4 measurement ID (from Firebase config); used if you wire gtag or GA outside the SDK. */
export const firebaseMeasurementId = publicFirebaseMeasurementId();

function clientConfig(): FirebaseOptions | null {
  const config = publicFirebaseConfig();
  return config ? ({ ...config } satisfies FirebaseOptions) : null;
}

/**
 * Returns the Firebase app in the browser (npm modular SDK: `initializeApp`).
 * Safe to call from client components / effects only (not during SSR render).
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;

  const config = clientConfig();
  if (!config?.projectId) return null;

  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp(config);
}
