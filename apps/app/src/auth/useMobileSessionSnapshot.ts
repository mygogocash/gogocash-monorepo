import { useEffect, useState } from "react";

import {
  subscribeMobileSessionChange,
  type MobileSession,
} from "@mobile/auth/session";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";

/**
 * Live snapshot of the mobile session. Reads on mount AND re-reads whenever the
 * session is written/cleared (via `subscribeMobileSessionChange`), so the UI —
 * e.g. the header's Sign-in vs account affordance — reflects login/logout without
 * needing a remount.
 */
export function useMobileSessionSnapshot(): MobileSession | null {
  const [session, setSession] = useState<MobileSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function readSession() {
      const sessionStore = await getSharedSessionStore();
      const nextSession = await sessionStore?.getSession();

      if (!cancelled) {
        setSession(nextSession ?? null);
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

  return session;
}
