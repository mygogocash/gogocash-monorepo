import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GoGoTrackDetector } from "@mobile/gototrack/detector";
import { useGoGoTrack } from "@mobile/gototrack/useGoGoTrack";

function fakeDetector(overrides: Partial<GoGoTrackDetector> = {}): GoGoTrackDetector {
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

describe("useGoGoTrack (render)", () => {
  it("reflects supported state synchronously on mount", () => {
    const { result } = renderHook(() =>
      useGoGoTrack({
        detector: fakeDetector(),
        api: { detect: vi.fn(async () => ({ matched: false })) },
      }),
    );

    expect(result.current.state.supported).toBe(true);
    expect(result.current.state.running).toBe(false);
  });

  it("start() transitions running and re-renders", async () => {
    const { result } = renderHook(() =>
      useGoGoTrack({
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
      useGoGoTrack({
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
