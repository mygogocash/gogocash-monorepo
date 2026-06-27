import { getFirebaseIdToken } from "@mobile/auth/firebaseClient";

const DEFAULT_TTL_MS = 55 * 60 * 1000;

let cached: { expiresAt: number; token: string } | null = null;
let inflight: Promise<string | null> | null = null;

export function clearFirebaseIdTokenCache(): void {
  cached = null;
  inflight = null;
}

/**
 * Reuses a recently fetched Firebase ID token so parallel API calls on cold
 * start do not each await getIdToken() independently. Concurrent callers share
 * one in-flight refresh promise.
 */
export async function getCachedFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  if (!forceRefresh && inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const token = await getFirebaseIdToken(forceRefresh);
      if (!token) {
        cached = null;
        return null;
      }

      cached = {
        expiresAt: Date.now() + DEFAULT_TTL_MS,
        token,
      };
      return token;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
