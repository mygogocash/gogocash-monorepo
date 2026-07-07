import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import type { GoGoTrackDetector } from "@mobile/gototrack/detector";
import { GoGoTrackUsageAccessBanner } from "@mobile/gototrack/GoGoTrackUsageAccessBanner";

function detector(overrides: Partial<GoGoTrackDetector> = {}): GoGoTrackDetector {
  return {
    isAndroidSupported: () => true,
    hasUsageAccessPermission: vi.fn(async () => false),
    openUsageAccessSettings: vi.fn(async () => undefined),
    hasNotificationListenerPermission: vi.fn(async () => false),
    openNotificationListenerSettings: vi.fn(async () => undefined),
    getCurrentForegroundPackage: vi.fn(async () => null),
    startDetection: vi.fn(async () => undefined),
    stopDetection: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("GoGoTrackUsageAccessBanner (render)", () => {
  it("android + ungranted > shows prominent usage access CTA", async () => {
    const spy = detector();

    await act(async () => {
      render(createElement(GoGoTrackUsageAccessBanner, { detector: spy }));
    });

    expect(screen.getByTestId("gototrack-usage-access-banner")).toBeTruthy();
    expect(screen.getByText("Usage access required")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId("gototrack-usage-access-settings-button"));
    });

    expect(spy.openUsageAccessSettings).toHaveBeenCalledOnce();
  });

  it("granted permission > renders nothing", async () => {
    await act(async () => {
      render(
        createElement(GoGoTrackUsageAccessBanner, {
          detector: detector({
            hasUsageAccessPermission: vi.fn(async () => true),
          }),
        }),
      );
    });

    expect(screen.queryByTestId("gototrack-usage-access-banner")).toBeNull();
  });
});
