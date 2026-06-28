import { requireOptionalNativeModule } from "expo-modules-core";

import type { GototrackNativeModule } from "../../src/gototrack/nativeDetector";

/**
 * Returns the linked Android-native `GototrackDetector` module, or `null` when
 * it is not present (iOS, web, Expo Go, or a build without the dev-client native
 * module). `requireOptionalNativeModule` never throws — it returns null — so the
 * platform selector can fall back to the unsupported detector cleanly.
 */
export function loadGototrackNativeModule(): GototrackNativeModule | null {
  return requireOptionalNativeModule<GototrackNativeModule>("GototrackDetector");
}
