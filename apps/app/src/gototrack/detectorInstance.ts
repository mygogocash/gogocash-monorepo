import { AppState, Platform } from "react-native";

import { loadGototrackNativeModule } from "../../modules/gototrack-detector";
import { selectGoGoTrackDetector } from "./selectDetector";

/**
 * The live GoGoTrack detector for the running app: native UsageStats detector on
 * Android (when the dev-client native module is linked), iOS AppState fallback,
 * else the unsupported no-op.
 */
export const gototrackDetector = selectGoGoTrackDetector({
  isAndroid: Platform.OS === "android",
  isIos: Platform.OS === "ios",
  loadNativeModule: loadGototrackNativeModule,
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
