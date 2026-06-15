import { describe, expect, it, vi } from "vitest";

import type { GoGoSenseDetectionResponse } from "@mobile/gogosense/api";
import type { GoGoSenseDetector } from "@mobile/gogosense/detector";
import { createGoGoSenseSession } from "@mobile/gogosense/session";

function createDetector(overrides: Partial<GoGoSenseDetector> = {}): GoGoSenseDetector {
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

describe("GoGoSense session controller", () => {
  it("permission > given usage access denied > then start fails and session is not running", async () => {
    const detector = createDetector({
      hasUsageAccessPermission: vi.fn(async () => false),
    });
    const session = createGoGoSenseSession({ api: { detect: vi.fn() }, detector });

    await expect(session.start()).resolves.toEqual({
      started: false,
      reason: "usage_permission_denied",
    });
    expect(session.getState()).toMatchObject({
      supported: true,
      permissionGranted: false,
      running: false,
    });
  });

  it("start > given permission granted > then session runs", async () => {
    const session = createGoGoSenseSession({
      api: { detect: vi.fn(async () => ({ matched: false })) },
      detector: createDetector(),
    });

    await expect(session.start()).resolves.toEqual({ started: true });
    expect(session.getState().running).toBe(true);
  });

  it("detection > given a matched merchant > then lastMatch is exposed and onChange fires", async () => {
    const response: GoGoSenseDetectionResponse = {
      matched: true,
      merchantId: "shopee",
      merchantName: "Shopee",
      recommendedAction: "activate",
    };
    const changes: number[] = [];
    const session = createGoGoSenseSession({
      api: { detect: vi.fn(async () => response) },
      detector: createDetector(),
      onChange: () => changes.push(1),
    });

    await session.start();
    await session.poll();

    expect(session.getState().lastMatch).toEqual({
      packageName: "com.shopee.th",
      response,
    });
    expect(changes.length).toBeGreaterThan(0);
  });

  it("detection > given an unmatched package > then no lastMatch is surfaced", async () => {
    const session = createGoGoSenseSession({
      api: { detect: vi.fn(async () => ({ matched: false })) },
      detector: createDetector(),
    });

    await session.start();
    await session.poll();

    expect(session.getState().lastMatch).toBeNull();
  });

  it("requestPermission > then opens the usage access settings screen", async () => {
    const detector = createDetector();
    const session = createGoGoSenseSession({ api: { detect: vi.fn() }, detector });

    await session.requestPermission();

    expect(detector.openUsageAccessSettings).toHaveBeenCalledOnce();
  });
});
