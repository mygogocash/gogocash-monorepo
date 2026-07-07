import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetGoGoTrackActivationMutexForTests,
  resolveGoGoTrackActivationKey,
  runExclusiveGoGoTrackActivation,
} from "@mobile/gototrack/activationMutex";
import { createGoGoTrackPromptCoordinator } from "@mobile/gototrack/promptCoordinator";
import { createGoGoTrackSession } from "@mobile/gototrack/session";
import type { GoGoTrackDetector } from "@mobile/gototrack/detector";
import type { GoGoTrackDetectionResponse } from "@mobile/gototrack/api";

function createDetector(): GoGoTrackDetector {
  return {
    isAndroidSupported: () => true,
    hasUsageAccessPermission: vi.fn(async () => true),
    openUsageAccessSettings: vi.fn(async () => undefined),
    hasNotificationListenerPermission: vi.fn(async () => false),
    openNotificationListenerSettings: vi.fn(async () => undefined),
    getCurrentForegroundPackage: vi.fn(async () => "com.shopee.th"),
    startDetection: vi.fn(async () => undefined),
    stopDetection: vi.fn(async () => undefined),
  };
}

describe("runExclusiveGoGoTrackActivation", () => {
  afterEach(() => {
    resetGoGoTrackActivationMutexForTests();
  });

  it("runExclusiveGoGoTrackActivation > given concurrent calls for same key > then runs activate once", async () => {
    const activate = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { deeplink: "https://track.gogocash.co/shopee" };
    });
    const key = resolveGoGoTrackActivationKey({
      detectionEventId: "det-1",
      merchantId: "shopee",
      offerId: 101,
      networkMerchantId: 201,
    });

    const [first, second] = await Promise.all([
      runExclusiveGoGoTrackActivation(key, activate),
      runExclusiveGoGoTrackActivation(key, activate),
    ]);

    expect(activate).toHaveBeenCalledOnce();
    expect(first).toEqual(second);
  });

  it("session + coordinator > given same detection event > then share one api.activate call", async () => {
    const response: GoGoTrackDetectionResponse = {
      matched: true,
      merchantId: "shopee",
      merchantName: "Shopee",
      offerId: 101,
      networkMerchantId: 201,
      detectionEventId: "det-shared",
      recommendedAction: "activate",
    };
    const activate = vi.fn(async () => ({
      activationEventId: "act-1",
      deeplink: "https://track.gogocash.co/shopee",
    }));
    const session = createGoGoTrackSession({
      api: { detect: vi.fn(async () => response), activate },
      detector: createDetector(),
    });
    const coordinator = createGoGoTrackPromptCoordinator({
      api: { activate },
      openUrl: vi.fn(async () => undefined),
    });

    await session.start();
    await session.poll();
    coordinator.showNativePrompt({
      packageName: "com.shopee.th",
      detectionEventId: "det-shared",
      merchantId: "shopee",
      merchantName: "Shopee",
      offerId: 101,
      networkMerchantId: 201,
    });

    await Promise.all([
      session.activate(),
      coordinator.activateFromNative({
        packageName: "com.shopee.th",
        detectionEventId: "det-shared",
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
      }),
    ]);

    expect(activate).toHaveBeenCalledOnce();
  });
});
