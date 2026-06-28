import { describe, expect, it } from "vitest";

import { selectGoGoTrackDetector } from "@mobile/gototrack/selectDetector";
import type { GototrackNativeModule } from "@mobile/gototrack/nativeDetector";

function fakeNative(): GototrackNativeModule {
  return {
    isAndroidSupported: () => true,
    hasUsageAccessPermission: async () => true,
    openUsageAccessSettings: async () => undefined,
    getCurrentForegroundPackage: async () => "com.shopee.th",
    startDetection: async () => undefined,
    stopDetection: async () => undefined,
  };
}

describe("GoGoTrack detector platform selection", () => {
  it("selection > given non-android > then unsupported detector", () => {
    const detector = selectGoGoTrackDetector({
      isAndroid: false,
      loadNativeModule: () => fakeNative(),
    });

    expect(detector.isAndroidSupported()).toBe(false);
  });

  it("selection > given android but native module missing > then unsupported detector", () => {
    const detector = selectGoGoTrackDetector({
      isAndroid: true,
      loadNativeModule: () => null,
    });

    expect(detector.isAndroidSupported()).toBe(false);
  });

  it("selection > given android with native module > then native-backed detector", async () => {
    const detector = selectGoGoTrackDetector({
      isAndroid: true,
      loadNativeModule: () => fakeNative(),
    });

    expect(detector.isAndroidSupported()).toBe(true);
    await expect(detector.getCurrentForegroundPackage()).resolves.toBe("com.shopee.th");
  });
});
