import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

// CustomerGoGoTrackScreen reaches i18n/LocaleProvider -> expo-localization ->
// expo-modules-core (native `expo` global absent under happy-dom). Device locale
// is not under test; mock the module at the seam (same as customer-gototrack.render).
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import type { GoGoTrackDetector } from "@mobile/gototrack/detector";
import { CustomerGoGoTrackScreen } from "@mobile/screens/CustomerGoGoTrackScreen";

function spyDetector(overrides: Partial<GoGoTrackDetector> = {}): GoGoTrackDetector {
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

describe("GoGoTrack permissions screen (render)", () => {
  it("android + ungranted > shows a grant control that opens usage-access settings", async () => {
    const detector = spyDetector();

    await act(async () => {
      render(createElement(CustomerGoGoTrackScreen, { mode: "permissions", detector }));
    });

    const button = screen.getByText("Grant usage access");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(detector.openUsageAccessSettings).toHaveBeenCalledOnce();
  });

  it("default (unsupported, iOS/web) > shows no grant control", async () => {
    await act(async () => {
      render(createElement(CustomerGoGoTrackScreen, { mode: "permissions" }));
    });

    expect(screen.queryByText("Grant usage access")).toBeNull();
  });
});
