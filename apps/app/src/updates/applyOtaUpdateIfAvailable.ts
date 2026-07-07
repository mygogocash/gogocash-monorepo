import * as Updates from "expo-updates";

export type OtaUpdateDeps = {
  checkForUpdateAsync: typeof Updates.checkForUpdateAsync;
  fetchUpdateAsync: typeof Updates.fetchUpdateAsync;
  reloadAsync: typeof Updates.reloadAsync;
  isEnabled: boolean;
  platformOs: string;
};

/**
 * On native release/preview builds, download a pending EAS Update and reload so
 * JS fixes ship without reinstalling the APK. No-op on web and when expo-updates
 * is disabled (local dev client).
 */
export async function applyOtaUpdateIfAvailable(
  deps: OtaUpdateDeps,
): Promise<"skipped" | "none" | "reloaded"> {
  if (deps.platformOs === "web" || !deps.isEnabled) {
    return "skipped";
  }

  try {
    const result = await deps.checkForUpdateAsync();
    if (!result.isAvailable) {
      return "none";
    }
    await deps.fetchUpdateAsync();
    await deps.reloadAsync();
    return "reloaded";
  } catch {
    // Missing manifest, offline, or misconfigured dev client — keep running cached bundle.
    return "skipped";
  }
}
