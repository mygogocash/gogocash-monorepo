import { createAvailableSessionStore, type MobileSessionStore } from "./session";

/**
 * Module-level memo over createAvailableSessionStore().
 *
 * Resolving the store is expensive on native (dynamic expo-secure-store import
 * plus an isAvailableAsync bridge round trip) and was previously re-run inside
 * every resource fetch. The store itself is a thin accessor over storage, so
 * caching the store — never the session value — is safe: token freshness comes
 * from the api-client re-reading getSession() per request.
 */
type SessionStoreFactory = () => Promise<MobileSessionStore | null>;

let storePromise: Promise<MobileSessionStore | null> | null = null;

export function getSharedSessionStore(
  factory: SessionStoreFactory = createAvailableSessionStore
): Promise<MobileSessionStore | null> {
  if (!storePromise) {
    storePromise = factory();
  }
  return storePromise;
}

export function resetSharedSessionStoreForTests(): void {
  storePromise = null;
}
