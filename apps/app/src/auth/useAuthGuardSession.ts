import { useEffect, useState } from "react";

import {
  createAvailableSessionStore,
  mobileSessionStorageKey,
  subscribeMobileSessionChange,
  type MobileSession,
} from "@mobile/auth/session";
import { hasUsableMobileSessionToken } from "@mobile/auth/sessionValidity";
import { getMobileEnv } from "@mobile/config/env";

type AuthGuardSession = {
  isAuthed: boolean;
  ready: boolean;
};

/**
 * Synchronous-on-first-render auth signal for expo-router `Stack.Protected`.
 *
 * The guard prop must be correct the moment the navigator mounts, but the
 * session store is async on native. On web we read `localStorage` synchronously
 * for the INITIAL value (mirroring `createWebSessionStore`'s parse), so the guard
 * is correct on first paint and `ready` is immediately true. On native there is
 * no sync source, so the initial read is async and `ready` flips true once it
 * resolves. After mount we stay reactive to login/logout via
 * `subscribeMobileSessionChange` so the guard updates without a remount.
 */
export function useAuthGuardSession(): AuthGuardSession {
  const [state, setState] = useState<AuthGuardSession>(() => {
    const session = readWebSessionSync();
    const env = getMobileEnv();

    // Web: localStorage is synchronous, so the initial read is authoritative.
    if (typeof window !== "undefined") {
      return {
        isAuthed: hasUsableMobileSessionToken(session, env.accountDataSource),
        ready: true,
      };
    }

    // Native: no synchronous source — defer to the async read below.
    return { isAuthed: false, ready: false };
  });

  useEffect(() => {
    let cancelled = false;

    async function readSession() {
      const sessionStore = await createAvailableSessionStore();
      let session: MobileSession | null | undefined = null;

      try {
        session = await sessionStore?.getSession();
      } catch {
        session = null;
      }

      if (!cancelled) {
        const env = getMobileEnv();
        const usable = hasUsableMobileSessionToken(session ?? null, env.accountDataSource);

        if (
          !usable &&
          env.accountDataSource === "backend" &&
          typeof session?.access_token === "string" &&
          session.access_token.length > 0
        ) {
          await sessionStore?.clearSession();
        }

        setState({ isAuthed: usable, ready: true });
      }
    }

    void readSession();
    const unsubscribe = subscribeMobileSessionChange(() => {
      void readSession();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Read + parse the persisted session from `localStorage` synchronously. Mirrors
 * the parse in `createWebSessionStore` (JSON-parse, reject non-object/array).
 * Returns null on any failure (unavailable storage, sandboxed iframe, bad JSON).
 */
function readWebSessionSync(): MobileSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(mobileSessionStorageKey);

    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as MobileSession)
      : null;
  } catch {
    return null;
  }
}
