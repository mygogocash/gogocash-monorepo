import { describe, expect, it } from "vitest";

import { createUnsupportedGoGoSenseDetector } from "@mobile/gogosense/detector";

describe("GoGoSense detector platform guard", () => {
  it("platform guard > given iOS/web unsupported detector > then unsupported methods do not crash", async () => {
    const detector = createUnsupportedGoGoSenseDetector();

    expect(detector.isAndroidSupported()).toBe(false);
    await expect(detector.hasUsageAccessPermission()).resolves.toBe(false);
    await expect(detector.hasNotificationListenerPermission()).resolves.toBe(false);
    await expect(detector.getCurrentForegroundPackage()).resolves.toBeNull();
    await expect(detector.startDetection()).resolves.toBeUndefined();
    await expect(detector.stopDetection()).resolves.toBeUndefined();
  });
});
