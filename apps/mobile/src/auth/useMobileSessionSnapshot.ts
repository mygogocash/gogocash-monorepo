import { useEffect, useState } from "react";

import { createAvailableSessionStore, type MobileSession } from "@mobile/auth/session";

export function useMobileSessionSnapshot(): MobileSession | null {
  const [session, setSession] = useState<MobileSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function readSession() {
      const sessionStore = await createAvailableSessionStore();
      const nextSession = await sessionStore?.getSession();

      if (!cancelled) {
        setSession(nextSession ?? null);
      }
    }

    void readSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
