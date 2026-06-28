import { describe, expect, it } from "vitest";

import { createUnsupportedGoGoTrackDetector } from "@mobile/gototrack/detector";

describe("GoGoTrack detector platform guard", () => {
  it("platform guard > given iOS/web unsupported detector > then unsupported methods do not crash", async () => {
    const detector = createUnsupportedGoGoTrackDetector();

    expect(detector.isAndroidSupported()).toBe(false);
    await expect(detector.hasUsageAccessPermission()).resolves.toBe(false);
    await expect(detector.hasNotificationListenerPermission()).resolves.toBe(false);
    await expect(detector.getCurrentForegroundPackage()).resolves.toBeNull();
    await expect(detector.startDetection()).resolves.toBeUndefined();
    await expect(detector.stopDetection()).resolves.toBeUndefined();
  });
});
