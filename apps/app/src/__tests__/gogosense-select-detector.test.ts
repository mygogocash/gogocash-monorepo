import { describe, expect, it } from "vitest";

import { selectGoGoSenseDetector } from "@mobile/gogosense/selectDetector";
import type { GogosenseNativeModule } from "@mobile/gogosense/nativeDetector";

function fakeNative(): GogosenseNativeModule {
  return {
    isAndroidSupported: () => true,
    hasUsageAccessPermission: async () => true,
    openUsageAccessSettings: async () => undefined,
    getCurrentForegroundPackage: async () => "com.shopee.th",
    startDetection: async () => undefined,
    stopDetection: async () => undefined,
  };
}

describe("GoGoSense detector platform selection", () => {
  it("selection > given non-android > then unsupported detector", () => {
    const detector = selectGoGoSenseDetector({
      isAndroid: false,
      loadNativeModule: () => fakeNative(),
    });

    expect(detector.isAndroidSupported()).toBe(false);
  });

  it("selection > given android but native module missing > then unsupported detector", () => {
    const detector = selectGoGoSenseDetector({
      isAndroid: true,
      loadNativeModule: () => null,
    });

    expect(detector.isAndroidSupported()).toBe(false);
  });

  it("selection > given android with native module > then native-backed detector", async () => {
    const detector = selectGoGoSenseDetector({
      isAndroid: true,
      loadNativeModule: () => fakeNative(),
    });

    expect(detector.isAndroidSupported()).toBe(true);
    await expect(detector.getCurrentForegroundPackage()).resolves.toBe("com.shopee.th");
  });
});
