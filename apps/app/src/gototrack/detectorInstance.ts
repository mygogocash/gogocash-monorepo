import { AppState, Platform } from "react-native";

import { selectGoGoTrackDetector } from "./selectDetector";

/**
 * The live GoGoTrack detector for the running app: native UsageStats detector on
 * Android (when the dev-client native module is linked), iOS AppState fallback,
 * else the unsupported no-op.
 */
export const gototrackDetector = selectGoGoTrackDetector({
  isAndroid: Platform.OS === "android",
  isIos: Platform.OS === "ios",
  loadNativeModule: () => {
    if (Platform.OS !== "android") {
      return null;
    }
    // Lazy require keeps expo-modules-core out of the web bundle path.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadGototrackNativeModule } = require("../../modules/gototrack-detector") as typeof import("../../modules/gototrack-detector");
    return loadGototrackNativeModule();
  },
  subscribeAppState: (listener) => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        listener("active");
        return;
      }
      if (next === "background") {
        listener("background");
        return;
      }
      listener("inactive");
    });
    return () => subscription.remove();
  },
});
