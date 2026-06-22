import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import type { GoGoSenseDetector } from "@mobile/gogosense/detector";
import { GoGoSenseDetectionBanner } from "@mobile/gogosense/GoGoSenseDetectionBanner";
import type { GoGoSenseHookApi } from "@mobile/gogosense/useGoGoSense";

function detector(pkg: string | null): GoGoSenseDetector {
  return {
    isAndroidSupported: () => true,
    hasUsageAccessPermission: vi.fn(async () => true),
    openUsageAccessSettings: vi.fn(async () => undefined),
    hasNotificationListenerPermission: vi.fn(async () => false),
    openNotificationListenerSettings: vi.fn(async () => undefined),
    getCurrentForegroundPackage: vi.fn(async () => pkg),
    startDetection: vi.fn(async () => undefined),
    stopDetection: vi.fn(async () => undefined),
  };
}

describe("GoGoSenseDetectionBanner (render)", () => {
  it("matched detection > shows the activate nudge and opens the deeplink", async () => {
    const api: GoGoSenseHookApi = {
      detect: vi.fn(async () => ({
        matched: true,
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
        recommendedAction: "activate" as const,
      })),
      activate: vi.fn(async () => ({
        activationEventId: "e1",
        deeplink: "https://track.gogocash.co/shopee",
      })),
    };
    const openUrl = vi.fn();

    await act(async () => {
      render(
        createElement(GoGoSenseDetectionBanner, {
          detector: detector("com.shopee.th"),
          api,
          openUrl,
        }),
      );
    });

    const button = await screen.findByText("Activate cashback");
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => expect(api.activate).toHaveBeenCalled());
    expect(openUrl).toHaveBeenCalledWith("https://track.gogocash.co/shopee");
  });

  it("no match > renders nothing", async () => {
    const api: GoGoSenseHookApi = { detect: vi.fn(async () => ({ matched: false })) };

    await act(async () => {
      render(
        createElement(GoGoSenseDetectionBanner, {
          detector: detector("com.unknown.app"),
          api,
          openUrl: vi.fn(),
        }),
      );
    });

    expect(screen.queryByText("Activate cashback")).toBeNull();
  });
});

describe("GoGoSenseDetectionBanner activation failures", () => {
  it("matched detection > given activation rejects > does not open a stale deeplink", async () => {
    const activate = vi
      .fn()
      .mockRejectedValueOnce(new Error("Unauthorized"))
      .mockResolvedValueOnce({
        activationEventId: "e2",
        deeplink: "https://track.gogocash.co/retry",
      });
    const api: GoGoSenseHookApi = {
      detect: vi.fn(async () => ({
        matched: true,
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
        recommendedAction: "activate" as const,
      })),
      activate,
    };
    const openUrl = vi.fn();

    render(
      createElement(GoGoSenseDetectionBanner, {
        api,
        detector: detector("com.shopee.th"),
        openUrl,
      })
    );

    await act(async () => {});
    const button = await screen.findByText("Activate cashback");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(api.activate).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalled();
    expect(await screen.findByText("Cashback activation failed. Please try again.")).toBeTruthy();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(api.activate).toHaveBeenCalledTimes(2);
    expect(openUrl).toHaveBeenCalledWith("https://track.gogocash.co/retry");
    expect(screen.queryByText("Cashback activation failed. Please try again.")).toBeNull();
  });
});
