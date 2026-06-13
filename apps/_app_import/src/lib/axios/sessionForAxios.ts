import type { Session } from "next-auth";
import { getSession } from "next-auth/react";

/** Short TTL + in-flight dedupe so parallel API calls do not each await `getSession()`. */
const CACHE_TTL_MS = 1500;

let cache: { value: Session | null; until: number } | null = null;
let pending: Promise<Session | null> | null = null;

/** Call after sign-out or auth errors so the next request does not reuse a stale token. */
export function clearAxiosSessionCache(): void {
  cache = null;
  pending = null;
}

/**
 * Session snapshot for the axios request interceptor (browser).
 * Server / non-browser callers bypass the cache and call `getSession()` directly.
 */
export async function getSessionForAxios(): Promise<Session | null> {
  if (typeof window === "undefined") {
    return getSession();
  }

  const now = Date.now();
  if (cache && cache.until > now) {
    return cache.value;
  }

  if (pending) {
    return pending;
  }

  pending = getSession()
    .then((s) => {
      cache = { value: s, until: Date.now() + CACHE_TTL_MS };
      return s;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}
