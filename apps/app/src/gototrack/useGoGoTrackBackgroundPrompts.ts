import { useEffect } from "react";

import { getMobileEnv } from "@mobile/config/env";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";
import type { GoGoTrackDetector } from "./detector";
import { bindDefaultLiveActivityLoader } from "./promptLiveActivityBridge";
import { ensureGoGoTrackPromptCoordinator } from "./promptBridge";
import { useGoGoTrackApi } from "./useGoGoTrackApi";
import { useGoGoTrackSettings } from "./useGoGoTrackSettings";

/**
 * Keeps the native background monitor config in sync with the opt-in toggle,
 * auth token, and API base URL. Android reads SharedPreferences; iOS Live
 * Activity uses the same coordinator entry point.
 */
export function useGoGoTrackBackgroundPrompts(
  detector: GoGoTrackDetector,
): void {
  const api = useGoGoTrackApi();
  const { settings } = useGoGoTrackSettings();

  useEffect(() => {
    bindDefaultLiveActivityLoader();
    if (!api?.activate) {
      return;
    }
    ensureGoGoTrackPromptCoordinator({ activate: api.activate });
  }, [api]);

  useEffect(() => {
    if (!detector.syncBackgroundPromptConfig) {
      return;
    }

    let active = true;
    void (async () => {
      const sessionStore = await getSharedSessionStore();
      const session = sessionStore ? await sessionStore.getSession() : null;
      const authToken =
        session && typeof session.access_token === "string"
          ? session.access_token
          : null;

      if (!active) {
        return;
      }

      await detector.syncBackgroundPromptConfig?.({
        enabled: settings.backgroundPromptsEnabled,
        authToken,
        apiBaseUrl: getMobileEnv().apiUrl,
      });
    })();

    return () => {
      active = false;
    };
  }, [detector, settings.backgroundPromptsEnabled]);
}
