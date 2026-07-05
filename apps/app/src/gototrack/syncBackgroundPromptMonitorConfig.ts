import { getMobileEnv } from "@mobile/config/env";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";

import type { GoGoTrackDetector } from "./detector";

export type BackgroundPromptMonitorConfig = {
  enabled: boolean;
  authToken: string | null;
  apiBaseUrl: string;
};

/** Reads session + env for the native background monitor SharedPreferences sync. */
export async function resolveBackgroundPromptMonitorConfig(
  enabled: boolean,
): Promise<BackgroundPromptMonitorConfig> {
  const sessionStore = await getSharedSessionStore();
  const session = sessionStore ? await sessionStore.getSession() : null;
  const authToken =
    session && typeof session.access_token === "string"
      ? session.access_token
      : null;

  return {
    enabled,
    authToken,
    apiBaseUrl: getMobileEnv().apiUrl,
  };
}

export async function syncBackgroundPromptMonitorConfig(
  detector: GoGoTrackDetector,
  enabled: boolean,
): Promise<void> {
  if (!detector.syncBackgroundPromptConfig) {
    return;
  }

  const config = await resolveBackgroundPromptMonitorConfig(enabled);
  await detector.syncBackgroundPromptConfig(config);
}
