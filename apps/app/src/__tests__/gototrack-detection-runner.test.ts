import { describe, expect, it, vi } from "vitest";

import { createGoGoTrackDetectionRunner } from "@mobile/gototrack/detectionRunner";
import type { GoGoTrackDetector } from "@mobile/gototrack/detector";

function createDetector(overrides: Partial<GoGoTrackDetector> = {}): GoGoTrackDetector {
  return {
    isAndroidSupported: () => true,
    hasUsageAccessPermission: vi.fn(async () => true),
    openUsageAccessSettings: vi.fn(async () => undefined),
    hasNotificationListenerPermission: vi.fn(async () => false),
    openNotificationListenerSettings: vi.fn(async () => undefined),
    getCurrentForegroundPackage: vi.fn(async () => "com.shopee.th"),
    startDetection: vi.fn(async () => undefined),
    stopDetection: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("GoGoTrack detection runner", () => {
  it("permissions > given usage access denied > then detector does not start", async () => {
    const detector = createDetector({
      hasUsageAccessPermission: vi.fn(async () => false),
    });
    const api = { detect: vi.fn() };
    const runner = createGoGoTrackDetectionRunner({ api, detector });

    await expect(runner.start()).resolves.toEqual({
      reason: "usage_permission_denied",
      started: false,
    });

    expect(detector.startDetection).not.toHaveBeenCalled();
    expect(api.detect).not.toHaveBeenCalled();
  });

  it("detection runner > given foreground package > then uploads Android package detection", async () => {
    const detector = createDetector();
    const api = { detect: vi.fn(async () => ({ matched: true })) };
    const runner = createGoGoTrackDetectionRunner({
      api,
      appVersion: "1.2.3",
      detector,
      now: () => new Date("2026-05-23T09:00:00.000Z"),
    });

    await expect(runner.start()).resolves.toEqual({ started: true });
    await expect(runner.pollForegroundPackage()).resolves.toEqual({
      detected: true,
      packageName: "com.shopee.th",
      suppressed: false,
    });

    expect(api.detect).toHaveBeenCalledWith({
      appVersion: "1.2.3",
      method: "android_package",
      observedAt: "2026-05-23T09:00:00.000Z",
      packageName: "com.shopee.th",
      platform: "android",
    });
  });

  it("throttling > given repeated merchant detections > then suppresses duplicates", async () => {
    let currentTime = new Date("2026-05-23T09:00:00.000Z");
    const detector = createDetector();
    const api = { detect: vi.fn(async () => ({ matched: true })) };
    const runner = createGoGoTrackDetectionRunner({
      api,
      cooldownMs: 30_000,
      detector,
      now: () => currentTime,
    });

    await runner.start();
    await runner.pollForegroundPackage();
    currentTime = new Date("2026-05-23T09:00:10.000Z");

    await expect(runner.pollForegroundPackage()).resolves.toEqual({
      detected: false,
      packageName: "com.shopee.th",
      suppressed: true,
    });

    expect(api.detect).toHaveBeenCalledTimes(1);
  });

  it("throttling > given detection upload fails > then does not suppress retry", async () => {
    const detector = createDetector();
    const api = {
      detect: vi
        .fn()
        .mockRejectedValueOnce(new Error("network unavailable"))
        .mockResolvedValueOnce({ matched: true }),
    };
    const runner = createGoGoTrackDetectionRunner({
      api,
      cooldownMs: 30_000,
      detector,
      now: () => new Date("2026-05-23T09:00:00.000Z"),
    });

    await runner.start();
    await expect(runner.pollForegroundPackage()).rejects.toThrow("network unavailable");
    await expect(runner.pollForegroundPackage()).resolves.toEqual({
      detected: true,
      packageName: "com.shopee.th",
      suppressed: false,
    });

    expect(api.detect).toHaveBeenCalledTimes(2);
  });
});
