import { describe, expect, it, vi } from "vitest";

import type { GoGoTrackDetectionResponse } from "@mobile/gototrack/api";
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

describe("GoGoTrack detection callback", () => {
  it("callback > given a matched detect response > then onDetection receives the merchant match", async () => {
    const response: GoGoTrackDetectionResponse = {
      matched: true,
      merchantId: "shopee",
      merchantName: "Shopee",
      recommendedAction: "activate",
    };
    const api = { detect: vi.fn(async () => response) };
    const seen: { packageName: string; response: GoGoTrackDetectionResponse }[] = [];
    const runner = createGoGoTrackDetectionRunner({
      api,
      detector: createDetector(),
      onDetection: (event) => seen.push(event),
    });

    await runner.start();
    await runner.pollForegroundPackage();

    expect(seen).toEqual([{ packageName: "com.shopee.th", response }]);
  });

  it("callback > given a suppressed (cooldown) detection > then onDetection fires only once", async () => {
    const response: GoGoTrackDetectionResponse = { matched: true, merchantId: "shopee" };
    const api = { detect: vi.fn(async () => response) };
    const seen: unknown[] = [];
    let clock = new Date("2026-05-23T09:00:00.000Z");
    const runner = createGoGoTrackDetectionRunner({
      api,
      cooldownMs: 30_000,
      detector: createDetector(),
      now: () => clock,
      onDetection: (event) => seen.push(event),
    });

    await runner.start();
    await runner.pollForegroundPackage();
    clock = new Date("2026-05-23T09:00:10.000Z");
    await runner.pollForegroundPackage(); // within cooldown → suppressed, no callback

    expect(seen).toHaveLength(1);
  });
});
