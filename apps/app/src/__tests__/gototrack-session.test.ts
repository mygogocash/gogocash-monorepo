import { describe, expect, it, vi } from "vitest";

import type { GoGoTrackDetectionResponse } from "@mobile/gototrack/api";
import type { GoGoTrackDetector } from "@mobile/gototrack/detector";
import { createGoGoTrackSession } from "@mobile/gototrack/session";

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

describe("GoGoTrack session controller", () => {
  it("permission > given usage access denied > then start fails and session is not running", async () => {
    const detector = createDetector({
      hasUsageAccessPermission: vi.fn(async () => false),
    });
    const session = createGoGoTrackSession({ api: { detect: vi.fn() }, detector });

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
    const session = createGoGoTrackSession({
      api: { detect: vi.fn(async () => ({ matched: false })) },
      detector: createDetector(),
    });

    await expect(session.start()).resolves.toEqual({ started: true });
    expect(session.getState().running).toBe(true);
  });

  it("detection > given a matched merchant > then lastMatch is exposed and onChange fires", async () => {
    const response: GoGoTrackDetectionResponse = {
      matched: true,
      merchantId: "shopee",
      merchantName: "Shopee",
      recommendedAction: "activate",
    };
    const changes: number[] = [];
    const session = createGoGoTrackSession({
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
    const session = createGoGoTrackSession({
      api: { detect: vi.fn(async () => ({ matched: false })) },
      detector: createDetector(),
    });

    await session.start();
    await session.poll();

    expect(session.getState().lastMatch).toBeNull();
  });

  it("requestPermission > then opens the usage access settings screen", async () => {
    const detector = createDetector();
    const session = createGoGoTrackSession({ api: { detect: vi.fn() }, detector });

    await session.requestPermission();

    expect(detector.openUsageAccessSettings).toHaveBeenCalledOnce();
  });

  it("activate > given a matched lastMatch > then calls api.activate and returns the deeplink", async () => {
    const response: GoGoTrackDetectionResponse = {
      matched: true,
      merchantId: "shopee",
      offerId: 101,
      networkMerchantId: 201,
      recommendedAction: "activate",
    };
    const activate = vi.fn(async () => ({
      activationEventId: "evt1",
      deeplink: "https://track.gogocash.co/shopee",
    }));
    const session = createGoGoTrackSession({
      api: { detect: vi.fn(async () => response), activate },
      detector: createDetector(),
    });

    await session.start();
    await session.poll();

    await expect(session.activate()).resolves.toEqual({
      deeplink: "https://track.gogocash.co/shopee",
    });
    expect(activate).toHaveBeenCalledWith({
      detectionEventId: undefined,
      merchantId: "shopee",
      offerId: 101,
      networkMerchantId: 201,
      source: "gototrack",
    });
  });

  it("activate > given no match > then returns null and never calls api.activate", async () => {
    const activate = vi.fn();
    const session = createGoGoTrackSession({
      api: { detect: vi.fn(async () => ({ matched: false })), activate },
      detector: createDetector(),
    });

    await session.start();
    await session.poll();

    await expect(session.activate()).resolves.toBeNull();
    expect(activate).not.toHaveBeenCalled();
  });
});
