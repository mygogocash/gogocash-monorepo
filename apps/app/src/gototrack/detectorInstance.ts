import { Platform } from "react-native";

import { loadGototrackNativeModule } from "../../modules/gototrack-detector";
import { selectGoGoTrackDetector } from "./selectDetector";

/**
 * The live GoGoTrack detector for the running app: native UsageStats detector on
 * Android (when the dev-client native module is linked), else the unsupported
 * no-op. Thin runtime wiring around the pure `selectGoGoTrackDetector` — kept out
 * of the node vitest path because it imports `react-native` + the native module.
 */
export const gototrackDetector = selectGoGoTrackDetector({
  isAndroid: Platform.OS === "android",
  loadNativeModule: loadGototrackNativeModule,
});
