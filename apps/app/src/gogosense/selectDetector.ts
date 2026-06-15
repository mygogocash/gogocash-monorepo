import { createUnsupportedGoGoSenseDetector, type GoGoSenseDetector } from "./detector";
import {
  createNativeAndroidDetector,
  type GogosenseNativeModule,
} from "./nativeDetector";

export interface SelectDetectorOptions {
  isAndroid: boolean;
  loadNativeModule: () => GogosenseNativeModule | null;
}

/**
 * Picks the live detector: the Android-native UsageStats detector when running
 * on Android with the native module linked, otherwise the unsupported no-op
 * detector (iOS, web, or an Expo Go / non-dev-client build without the module).
 * Pure + dependency-injected so it stays testable under the node vitest env —
 * the real `Platform.OS` + `requireNativeModule` wiring lives in detectorInstance.ts.
 */
export function selectGoGoSenseDetector(
  options: SelectDetectorOptions,
): GoGoSenseDetector {
  if (!options.isAndroid) {
    return createUnsupportedGoGoSenseDetector();
  }

  const native = options.loadNativeModule();
  if (!native) {
    return createUnsupportedGoGoSenseDetector();
  }

  return createNativeAndroidDetector(native);
}
