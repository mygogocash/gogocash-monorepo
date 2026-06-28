import { useCallback, useEffect, useState } from "react";

import type { GoGoTrackSettingsUpdate } from "./api";
import { useGoGoTrackApi } from "./useGoGoTrackApi";

export type GoGoTrackSettingsState = {
  enabled: boolean;
  usageStatsEnabled: boolean;
  notificationListenerEnabled: boolean;
  screenshotRecoveryEnabled: boolean;
};

export type GoGoTrackSettingsField = keyof GoGoTrackSettingsState;

type SettingsApi = {
  getSettings(): Promise<unknown>;
  updateSettings(update: GoGoTrackSettingsUpdate): Promise<unknown>;
};

const DEFAULTS: GoGoTrackSettingsState = {
  enabled: false,
  usageStatsEnabled: false,
  notificationListenerEnabled: false,
  screenshotRecoveryEnabled: true,
};

// Backend persists snake_case; the update DTO is camelCase (mapped server-side).
function normalize(data: unknown): GoGoTrackSettingsState {
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    enabled: Boolean(d.enabled),
    usageStatsEnabled: Boolean(d.usage_stats_enabled),
    notificationListenerEnabled: Boolean(d.notification_listener_enabled),
    screenshotRecoveryEnabled:
      d.screenshot_recovery_enabled == null
        ? true
        : Boolean(d.screenshot_recovery_enabled),
  };
}

/**
 * Loads + persists the GoGoTrack privacy settings. Toggling is optimistic (local
 * state flips immediately, the update is fire-and-forget). Off-device the api is
 * null, so the screen shows defaults and toggles are no-ops. `apiOverride` is the
 * test seam.
 */
export function useGoGoTrackSettings(apiOverride?: SettingsApi | null) {
  const liveApi = useGoGoTrackApi();
  const api = apiOverride ?? liveApi;
  const [settings, setSettings] = useState<GoGoTrackSettingsState>(DEFAULTS);

  useEffect(() => {
    if (!api) {
      return;
    }
    let active = true;
    void api
      .getSettings()
      .then((data) => {
        if (active) {
          setSettings(normalize(data));
        }
      })
      .catch(() => {
        // Keep defaults on load failure.
      });
    return () => {
      active = false;
    };
  }, [api]);

  const setField = useCallback(
    (field: GoGoTrackSettingsField, value: boolean) => {
      const previous = settings;
      setSettings((prev) => ({ ...prev, [field]: value }));
      void api?.updateSettings({ [field]: value }).catch(() => {
        setSettings(previous);
      });
    },
    [api, settings],
  );

  return { settings, setField };
}
