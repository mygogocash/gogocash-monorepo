import { useCallback, useEffect, useState } from "react";

import type { GoGoSenseSettingsUpdate } from "./api";
import { useGoGoSenseApi } from "./useGoGoSenseApi";

export type GoGoSenseSettingsState = {
  enabled: boolean;
  usageStatsEnabled: boolean;
  notificationListenerEnabled: boolean;
  screenshotRecoveryEnabled: boolean;
};

export type GoGoSenseSettingsField = keyof GoGoSenseSettingsState;

type SettingsApi = {
  getSettings(): Promise<unknown>;
  updateSettings(update: GoGoSenseSettingsUpdate): Promise<unknown>;
};

const DEFAULTS: GoGoSenseSettingsState = {
  enabled: false,
  usageStatsEnabled: false,
  notificationListenerEnabled: false,
  screenshotRecoveryEnabled: true,
};

// Backend persists snake_case; the update DTO is camelCase (mapped server-side).
function normalize(data: unknown): GoGoSenseSettingsState {
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
 * Loads + persists the GoGoSense privacy settings. Toggling is optimistic (local
 * state flips immediately, the update is fire-and-forget). Off-device the api is
 * null, so the screen shows defaults and toggles are no-ops. `apiOverride` is the
 * test seam.
 */
export function useGoGoSenseSettings(apiOverride?: SettingsApi | null) {
  const liveApi = useGoGoSenseApi();
  const api = apiOverride ?? liveApi;
  const [settings, setSettings] = useState<GoGoSenseSettingsState>(DEFAULTS);

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
    (field: GoGoSenseSettingsField, value: boolean) => {
      setSettings((prev) => ({ ...prev, [field]: value }));
      void api?.updateSettings({ [field]: value }).catch(() => {
        // Optimistic: a failed persist is left as-is for the MVP.
      });
    },
    [api],
  );

  return { settings, setField };
}
