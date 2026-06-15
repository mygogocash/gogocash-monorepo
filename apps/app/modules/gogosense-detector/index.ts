import { requireOptionalNativeModule } from "expo-modules-core";

import type { GogosenseNativeModule } from "../../src/gogosense/nativeDetector";

/**
 * Returns the linked Android-native `GogosenseDetector` module, or `null` when
 * it is not present (iOS, web, Expo Go, or a build without the dev-client native
 * module). `requireOptionalNativeModule` never throws — it returns null — so the
 * platform selector can fall back to the unsupported detector cleanly.
 */
export function loadGogosenseNativeModule(): GogosenseNativeModule | null {
  return requireOptionalNativeModule<GogosenseNativeModule>("GogosenseDetector");
}
