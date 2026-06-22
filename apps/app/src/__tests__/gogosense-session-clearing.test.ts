import { describe, expect, it, vi } from "vitest";

import type { GoGoSenseDetector } from "@mobile/gogosense/detector";
import { createGoGoSenseSession } from "@mobile/gogosense/session";

function detectorWithPackages(packages: Array<string | null>): GoGoSenseDetector {
  return {
    getCurrentForegroundPackage: vi.fn(async () => packages.shift() ?? null),
    hasNotificationListenerPermission: vi.fn(async () => false),
    hasUsageAccessPermission: vi.fn(async () => true),
    isAndroidSupported: vi.fn(() => true),
    openNotificationListenerSettings: vi.fn(async () => undefined),
    openUsageAccessSettings: vi.fn(async () => undefined),
    startDetection: vi.fn(async () => undefined),
    stopDetection: vi.fn(async () => undefined),
  };
}

describe("GoGoSense session stale match clearing", () => {
  it("polling > given the foreground app becomes unsupported > clears the surfaced merchant match", async () => {
    const detector = detectorWithPackages(["com.shopee.th", "com.unknown.app"]);
    const api = {
      detect: vi.fn(async ({ packageName }: { packageName?: string }) =>
        packageName === "com.shopee.th"
          ? {
              matched: true,
              merchantId: "shopee",
              merchantName: "Shopee",
              networkMerchantId: 201,
              offerId: 101,
              recommendedAction: "activate" as const,
            }
          : { matched: false }
      ),
    };
    const onChange = vi.fn();
    const session = createGoGoSenseSession({ api, detector, onChange });

    await session.start();
    await session.poll();

    expect(session.getState().lastMatch?.response.merchantId).toBe("shopee");

    await session.poll();

    expect(session.getState().lastMatch).toBeNull();
    expect(api.detect).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalled();
  });
});
