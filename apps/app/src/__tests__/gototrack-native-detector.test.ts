import { describe, expect, it, vi } from "vitest";

import {
  createNativeAndroidDetector,
  type GototrackNativeModule,
} from "@mobile/gototrack/nativeDetector";

function createNative(
  overrides: Partial<GototrackNativeModule> = {},
): GototrackNativeModule {
  return {
    isAndroidSupported: () => true,
    hasUsageAccessPermission: vi.fn(async () => true),
    openUsageAccessSettings: vi.fn(async () => undefined),
    getCurrentForegroundPackage: vi.fn(async () => "com.shopee.th"),
    startDetection: vi.fn(async () => undefined),
    stopDetection: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("GoGoTrack native Android detector adapter", () => {
  it("delegation > given native module > then forwards usage-access + foreground calls", async () => {
    const native = createNative();
    const detector = createNativeAndroidDetector(native);

    expect(detector.isAndroidSupported()).toBe(true);
    await expect(detector.hasUsageAccessPermission()).resolves.toBe(true);
    await expect(detector.getCurrentForegroundPackage()).resolves.toBe("com.shopee.th");

    await detector.openUsageAccessSettings();
    expect(native.openUsageAccessSettings).toHaveBeenCalledOnce();
    await detector.startDetection();
    expect(native.startDetection).toHaveBeenCalledOnce();
    await detector.stopDetection();
    expect(native.stopDetection).toHaveBeenCalledOnce();
  });

  it("deferred signals > given UsageStats-only MVP > then notification listener is a safe no-op", async () => {
    const detector = createNativeAndroidDetector(createNative());

    await expect(detector.hasNotificationListenerPermission()).resolves.toBe(false);
    await expect(detector.openNotificationListenerSettings()).resolves.toBeUndefined();
  });
});
