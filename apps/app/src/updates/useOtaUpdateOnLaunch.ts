import * as Updates from "expo-updates";
import { useEffect } from "react";
import { Platform } from "react-native";

import { applyOtaUpdateIfAvailable } from "@mobile/updates/applyOtaUpdateIfAvailable";
import { logStagingAcceptanceMarker } from "@mobile/updates/stagingAcceptanceMarker";

/** Check for a staging/production OTA bundle once when the app shell mounts. */
export function useOtaUpdateOnLaunch() {
  useEffect(() => {
    logStagingAcceptanceMarker();
    void applyOtaUpdateIfAvailable({
      checkForUpdateAsync: Updates.checkForUpdateAsync,
      fetchUpdateAsync: Updates.fetchUpdateAsync,
      reloadAsync: Updates.reloadAsync,
      isEnabled: Updates.isEnabled,
      platformOs: Platform.OS,
    });
  }, []);
}
