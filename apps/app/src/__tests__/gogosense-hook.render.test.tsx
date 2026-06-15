import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GoGoSenseDetector } from "@mobile/gogosense/detector";
import { useGoGoSense } from "@mobile/gogosense/useGoGoSense";

function fakeDetector(overrides: Partial<GoGoSenseDetector> = {}): GoGoSenseDetector {
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

describe("useGoGoSense (render)", () => {
  it("reflects supported state synchronously on mount", () => {
    const { result } = renderHook(() =>
      useGoGoSense({
        detector: fakeDetector(),
        api: { detect: vi.fn(async () => ({ matched: false })) },
      }),
    );

    expect(result.current.state.supported).toBe(true);
    expect(result.current.state.running).toBe(false);
  });

  it("start() transitions running and re-renders", async () => {
    const { result } = renderHook(() =>
      useGoGoSense({
        detector: fakeDetector(),
        api: { detect: vi.fn(async () => ({ matched: false })) },
      }),
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state.running).toBe(true);
  });

  it("a matched poll surfaces lastMatch to the component", async () => {
    const response = {
      matched: true,
      merchantId: "shopee",
      merchantName: "Shopee",
      recommendedAction: "activate" as const,
    };
    const { result } = renderHook(() =>
      useGoGoSense({
        detector: fakeDetector(),
        api: { detect: vi.fn(async () => response) },
      }),
    );

    await act(async () => {
      await result.current.start();
      await result.current.poll();
    });

    expect(result.current.state.lastMatch?.response.merchantId).toBe("shopee");
  });
});
