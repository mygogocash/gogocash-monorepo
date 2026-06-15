import { Platform } from "react-native";

import { loadGogosenseNativeModule } from "../../modules/gogosense-detector";
import { selectGoGoSenseDetector } from "./selectDetector";

/**
 * The live GoGoSense detector for the running app: native UsageStats detector on
 * Android (when the dev-client native module is linked), else the unsupported
 * no-op. Thin runtime wiring around the pure `selectGoGoSenseDetector` — kept out
 * of the node vitest path because it imports `react-native` + the native module.
 */
export const gogosenseDetector = selectGoGoSenseDetector({
  isAndroid: Platform.OS === "android",
  loadNativeModule: loadGogosenseNativeModule,
});
