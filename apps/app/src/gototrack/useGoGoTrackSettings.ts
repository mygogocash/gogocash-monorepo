import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { getMobileEnv } from "@mobile/config/env";

import type { GoGoTrackSettingsUpdate } from "./api";
import {
  resolveGoGoTrackSettingsOverrideQueryKey,
  resolveGoGoTrackSettingsQueryKey,
  resolveGoGoTrackSettingsSessionScope,
} from "./gototrackSettingsQueryKey";
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

export const OFFLINE_GOTOTRACK_SETTINGS_QUERY_KEY = ["gototrack-settings", "offline"] as const;

let offlineSettingsSnapshot: GoGoTrackSettingsState = { ...DEFAULTS };
const offlineSettingsListeners = new Set<() => void>();

function subscribeOfflineSettings(onStoreChange: () => void) {
  offlineSettingsListeners.add(onStoreChange);
  return () => {
    offlineSettingsListeners.delete(onStoreChange);
  };
}

function getOfflineSettingsSnapshot() {
  return offlineSettingsSnapshot;
}

function publishOfflineSettings(next: GoGoTrackSettingsState) {
  offlineSettingsSnapshot = next;
  for (const listener of offlineSettingsListeners) {
    listener();
  }
}

export function resetOfflineGoGoTrackSettingsForTests(): void {
  offlineSettingsSnapshot = { ...DEFAULTS };
  for (const listener of offlineSettingsListeners) {
    listener();
  }
}

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

function defaultSyncMonitor(enabled: boolean): void {
  void (async () => {
    const [{ gototrackDetector }, { syncBackgroundPromptMonitorConfig }] =
      await Promise.all([
        import("./detectorInstance"),
        import("./syncBackgroundPromptMonitorConfig"),
      ]);
    await syncBackgroundPromptMonitorConfig(gototrackDetector, enabled);
  })().catch(() => {
    // Best-effort: foreground re-sync remains the fallback.
  });
}

/**
 * Loads + persists GoGoTrack privacy settings via a shared React Query cache so
 * stacked hub/permissions/settings screens stay in sync. Toggling is optimistic.
 */
export function useGoGoTrackSettings(
  apiOverride?: SettingsApi | null,
  options?: {
    onPersistError?: (field: GoGoTrackSettingsField) => void;
    syncMonitor?: (enabled: boolean) => void;
  },
) {
  const env = useMemo(() => getMobileEnv(), []);
  const session = useMobileSessionSnapshot();
  const liveApi = useGoGoTrackApi();
  const api = apiOverride === undefined ? liveApi : apiOverride;
  const queryClient = useQueryClient();
  const onPersistError = options?.onPersistError;
  const syncMonitor = options?.syncMonitor ?? defaultSyncMonitor;
  const offlineSettings = useSyncExternalStore(
    subscribeOfflineSettings,
    getOfflineSettingsSnapshot,
    getOfflineSettingsSnapshot,
  );

  const queryKey = useMemo(() => {
    if (!api) {
      return OFFLINE_GOTOTRACK_SETTINGS_QUERY_KEY;
    }
    if (apiOverride !== undefined) {
      return resolveGoGoTrackSettingsOverrideQueryKey(api);
    }
    return resolveGoGoTrackSettingsQueryKey(
      env.apiUrl ?? "",
      resolveGoGoTrackSettingsSessionScope(session),
    );
  }, [api, apiOverride, env.apiUrl, session]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(api),
    queryFn: () => api!.getSettings().then(normalize),
    staleTime: 60_000,
  });

  const settings = api ? (query.data ?? DEFAULTS) : offlineSettings;
  const isSettingsReady = api ? query.isFetched && !query.isLoading : false;

  const setField = useCallback(
    (field: GoGoTrackSettingsField, value: boolean) => {
      const previous = api
        ? queryClient.getQueryData<GoGoTrackSettingsState>(queryKey) ?? DEFAULTS
        : offlineSettingsSnapshot;
      const optimistic = { ...previous, [field]: value };

      if (api) {
        queryClient.setQueryData(queryKey, optimistic);
      } else {
        publishOfflineSettings(optimistic);
        queryClient.setQueryData(OFFLINE_GOTOTRACK_SETTINGS_QUERY_KEY, optimistic);
      }

      if (field === "backgroundPromptsEnabled") {
        void writeBackgroundPromptsEnabled(value);
        syncMonitor(value);
      }

      if (!api) {
        return;
      }

      const payload: GoGoTrackSettingsUpdate = { [field]: value };
      if (
        value &&
        (field === "backgroundPromptsEnabled" || field === "usageStatsEnabled")
      ) {
        payload.enabled = true;
      }

      void api.updateSettings(payload).catch(() => {
        queryClient.setQueryData(queryKey, previous);
        if (field === "backgroundPromptsEnabled") {
          void writeBackgroundPromptsEnabled(previous.backgroundPromptsEnabled);
          syncMonitor(previous.backgroundPromptsEnabled);
        }
        onPersistError?.(field);
      });
    },
    [api, onPersistError, queryClient, queryKey, syncMonitor],
  );

  return { isSettingsReady, settings, setField };
}
