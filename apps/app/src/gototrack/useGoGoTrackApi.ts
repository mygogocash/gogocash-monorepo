import { useEffect, useState } from "react";

import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";

import { createGoGoTrackApi } from "./api";

type GoGoTrackApi = ReturnType<typeof createGoGoTrackApi>;

/**
 * Builds the authed GoGoTrack api from the shared mobile api client. Resolves to
 * `null` when no session store is available on this platform (web / render
 * tests), or when the app is not on `accountDataSource=backend` (fixtures demo
 * sessions must never hit the live API — a 401 would force-logout the user).
 * GoGoTrack read-only screens fall back to defaults instead of crashing.
 * The client re-reads the session per request, so no refresh wiring.
 */
export function useGoGoTrackApi(enabled = true): GoGoTrackApi | null {
  const [api, setApi] = useState<GoGoTrackApi | null>(null);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setApi(null);
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const env = getMobileEnv();
        if (env.accountDataSource !== "backend") {
          if (active) {
            setApi(null);
          }
          return;
        }

        const client = await getSharedMobileApiClient(env.apiUrl);
        if (active) {
          setApi(client ? createGoGoTrackApi(client) : null);
        }
      } catch {
        // Off-device / no session store: stay null (read-only UI).
        if (active) {
          setApi(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [enabled]);

  return api;
}
