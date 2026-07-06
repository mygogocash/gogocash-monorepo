import { useCallback, useEffect, useState } from "react";

import type { GoGoTrackSettingsUpdate } from "./api";
import { writeBackgroundPromptsEnabled } from "./promptSettingsStorage";
import { useGoGoTrackApi } from "./useGoGoTrackApi";

export type GoGoTrackSettingsState = {
  enabled: boolean;
  usageStatsEnabled: boolean;
  notificationListenerEnabled: boolean;
  screenshotRecoveryEnabled: boolean;
  backgroundPromptsEnabled: boolean;
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
  backgroundPromptsEnabled: false,
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
    backgroundPromptsEnabled: Boolean(d.background_prompts_enabled),
  };
}

/**
 * Each useGoGoTrackSettings call owns private state, so the monitor-sync hook's
 * instance never sees a toggle made through the settings tab's instance. The
 * native monitor must therefore be synced here, at the mutation site — not only
 * from useGoGoTrackBackgroundPrompts' mount/foreground re-syncs.
 */
function defaultSyncMonitor(enabled: boolean): void {
  void (async () => {
    const [{ gototrackDetector }, { syncBackgroundPromptMonitorConfig }] =
      await Promise.all([
        import("./detectorInstance"),
        import("./syncBackgroundPromptMonitorConfig"),
      ]);
    await syncBackgroundPromptMonitorConfig(gototrackDetector, enabled);
  })().catch(() => {
    // Best-effort: the mount/foreground re-sync remains the fallback.
  });
}

/**
 * Loads + persists the GoGoTrack privacy settings. Toggling is optimistic (local
 * state flips immediately, the update is fire-and-forget). Off-device the api is
 * null, so the screen shows defaults and toggles are no-ops. `apiOverride` and
 * `options.syncMonitor` are the test seams.
 */
export function useGoGoTrackSettings(
  apiOverride?: SettingsApi | null,
  options?: {
    onPersistError?: (field: GoGoTrackSettingsField) => void;
    syncMonitor?: (enabled: boolean) => void;
  },
) {
  const liveApi = useGoGoTrackApi();
  const api = apiOverride ?? liveApi;
  const [settings, setSettings] = useState<GoGoTrackSettingsState>(DEFAULTS);
  const onPersistError = options?.onPersistError;
  const syncMonitor = options?.syncMonitor ?? defaultSyncMonitor;

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
      if (field === "backgroundPromptsEnabled") {
        void writeBackgroundPromptsEnabled(value);
        syncMonitor(value);
      }
      const payload: GoGoTrackSettingsUpdate = { [field]: value };
      if (
        value &&
        (field === "backgroundPromptsEnabled" || field === "usageStatsEnabled")
      ) {
        payload.enabled = true;
      }

      void api?.updateSettings(payload).catch(() => {
        setSettings(previous);
        if (field === "backgroundPromptsEnabled") {
          void writeBackgroundPromptsEnabled(previous.backgroundPromptsEnabled);
          syncMonitor(previous.backgroundPromptsEnabled);
        }
        onPersistError?.(field);
      });
    },
    [api, onPersistError, settings, syncMonitor],
  );

  return { settings, setField };
}
