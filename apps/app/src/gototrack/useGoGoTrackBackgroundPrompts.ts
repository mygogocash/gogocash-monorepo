import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { subscribeMobileSessionChange } from "@mobile/auth/session";

import type { GoGoTrackDetector } from "./detector";
import { bindDefaultLiveActivityLoader } from "./promptLiveActivityBridge";
import { ensureGoGoTrackPromptCoordinator } from "./promptBridge";
import { syncBackgroundPromptMonitorConfig } from "./syncBackgroundPromptMonitorConfig";
import { useGoGoTrackApi } from "./useGoGoTrackApi";
import { useGoGoTrackSettings } from "./useGoGoTrackSettings";

/**
 * Keeps the native background monitor config in sync with the opt-in toggle,
 * auth token, and API base URL. Re-syncs when the session loads or the app
 * returns to foreground so Shopee notifications are not stuck without JWT.
 */
export function useGoGoTrackBackgroundPrompts(
  detector: GoGoTrackDetector,
): void {
  const api = useGoGoTrackApi();
  const { isSettingsReady, settings } = useGoGoTrackSettings();

  useEffect(() => {
    if (Platform.OS === "ios") {
      bindDefaultLiveActivityLoader();
    }
    if (!api?.activate) {
      return;
    }
    ensureGoGoTrackPromptCoordinator({ activate: api.activate });
  }, [api]);

  useEffect(() => {
    if (!isSettingsReady) {
      return;
    }

    let active = true;

    const sync = () => {
      if (!active) {
        return;
      }
      void syncBackgroundPromptMonitorConfig(
        detector,
        settings.backgroundPromptsEnabled,
      );
    };

    sync();
    const unsubscribeSession = subscribeMobileSessionChange(sync);
    const appStateSubscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        sync();
      }
    });

    return () => {
      active = false;
      unsubscribeSession();
      appStateSubscription.remove();
    };
  }, [detector, isSettingsReady, settings.backgroundPromptsEnabled]);
}
