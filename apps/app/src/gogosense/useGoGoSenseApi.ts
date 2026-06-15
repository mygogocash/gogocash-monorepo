import { useEffect, useState } from "react";

import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";

import { createGoGoSenseApi } from "./api";

export type GoGoSenseApi = ReturnType<typeof createGoGoSenseApi>;

/**
 * Builds the authed GoGoSense api from the shared mobile api client. Resolves to
 * `null` when no session store is available on this platform (web / render
 * harness / logged-out) — callers degrade to a read-only/empty UI rather than
 * crashing. The client re-reads the session per request, so no refresh wiring.
 */
export function useGoGoSenseApi(): GoGoSenseApi | null {
  const [api, setApi] = useState<GoGoSenseApi | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const client = await getSharedMobileApiClient(getMobileEnv().apiUrl);
        if (active && client) {
          setApi(createGoGoSenseApi(client));
        }
      } catch {
        // Off-device / no session store: stay null (read-only UI).
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return api;
}
