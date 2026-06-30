import { createUnsupportedGoGoTrackDetector, type GoGoTrackDetector } from "./detector";
import {
  createNativeAndroidDetector,
  type GototrackNativeModule,
} from "./nativeDetector";
import { createIosAppStateFallbackDetector } from "./iosAppStateFallbackDetector";

export interface SelectDetectorOptions {
  isAndroid: boolean;
  isIos?: boolean;
  loadNativeModule: () => GototrackNativeModule | null;
  subscribeAppState?: (
    listener: (state: "active" | "background" | "inactive") => void,
  ) => () => void;
}

/**
 * Picks the live detector: the Android-native UsageStats detector when running
 * on Android with the native module linked, otherwise the unsupported no-op
 * detector (iOS, web, or an Expo Go / non-dev-client build without the module).
 * Pure + dependency-injected so it stays testable under the node vitest env —
 * the real `Platform.OS` + `requireNativeModule` wiring lives in detectorInstance.ts.
 */
export function selectGoGoTrackDetector(
  options: SelectDetectorOptions,
): GoGoTrackDetector {
  if (options.isIos && options.subscribeAppState) {
    return createIosAppStateFallbackDetector(options.subscribeAppState);
  }

  if (!options.isAndroid) {
    return createUnsupportedGoGoTrackDetector();
  }

  const native = options.loadNativeModule();
  if (!native) {
    return createUnsupportedGoGoTrackDetector();
  }

  return createNativeAndroidDetector(native);
}
