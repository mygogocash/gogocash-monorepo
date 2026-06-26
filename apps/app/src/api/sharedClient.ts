import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";
import { createMobileApiClient } from "./client";

/**
 * Module-level memo over createMobileApiClient, keyed by baseUrl.
 *
 * Token freshness needs no rebuild and no session subscription: the client
 * re-reads sessionStore.getSession() on every request, so login/logout are
 * picked up automatically. Resolves null when no session store is available
 * on this platform (callers surface that as SESSION_STORE_UNAVAILABLE).
 */
type SharedClient = ReturnType<typeof createMobileApiClient>;

let cached: { baseUrl: string; client: SharedClient } | null = null;

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
      getPreferredAuthToken: async () => {
        try {
          const { getFirebaseIdToken } = await import("@mobile/auth/firebaseClient");
          return await getFirebaseIdToken();
        } catch {
          return null;
        }
      },
      sessionStore,
    }),
  };
  return cached.client;
}

export function resetSharedMobileApiClientForTests(): void {
  cached = null;
}
