import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";
import { shouldAttachFirebasePreferredAuthToken } from "@mobile/api/mobileApiAuthStrategy";
import { createMobileApiClient } from "./client";

/**
 * Module-level memo over createMobileApiClient, keyed by baseUrl.
 *
 * Token freshness needs no rebuild and no session subscription: the client
 * re-reads sessionStore.getSession() on every request, so login/logout are
 * picked up automatically. Resolves null when no session store is available
 * on this platform (callers surface that as SESSION_STORE_UNAVAILABLE).
 *
 * Native (Android/iOS) uses the backend JWT persisted in SecureStore only.
 * Firebase phone OTP is Expo-web-only today, so preferring Firebase ID tokens
 * on native often 401s wallet/profile despite a valid backend session.
 */
type SharedClient = ReturnType<typeof createMobileApiClient>;

let cached: { baseUrl: string; client: SharedClient } | null = null;

function resolvePreferredAuthTokenGetter():
  | (() => Promise<string | null>)
  | undefined {
  if (!shouldAttachFirebasePreferredAuthToken()) {
    return undefined;
  }

  return async () => {
    try {
      const { getCachedFirebaseIdToken } = await import("@mobile/auth/firebaseIdTokenCache");
      return await getCachedFirebaseIdToken();
    } catch {
      return null;
    }
  };
}

export async function getSharedMobileApiClient(
  baseUrl: string
): Promise<SharedClient | null> {
  if (cached && cached.baseUrl === baseUrl) {
    return cached.client;
  }

  const sessionStore = await getSharedSessionStore();
  if (!sessionStore) {
    return null;
  }

  cached = {
    baseUrl,
    client: createMobileApiClient({
      baseUrl,
      getPreferredAuthToken: resolvePreferredAuthTokenGetter(),
      sessionStore,
    }),
  };
  return cached.client;
}

export function resetSharedMobileApiClientForTests(): void {
  cached = null;
}
