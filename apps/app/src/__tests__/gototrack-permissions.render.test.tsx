import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

// CustomerGoGoTrackScreen reaches i18n/LocaleProvider -> expo-localization ->
// expo-modules-core (native `expo` global absent under happy-dom). Device locale
// is not under test; mock the module at the seam (same as customer-gototrack.render).
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import type { GoGoTrackDetector } from "@mobile/gototrack/detector";
import { ToastProvider } from "@mobile/components/Toast";
import { CustomerGoGoTrackScreen } from "@mobile/screens/CustomerGoGoTrackScreen";

function renderGoGoTrackScreen(props: ComponentProps<typeof CustomerGoGoTrackScreen>) {
  return render(createElement(ToastProvider, {}, createElement(CustomerGoGoTrackScreen, props)));
}

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
  it("permissions mode > renders disclosure title + grant hero + Grant usage access", async () => {
    const detector = spyDetector();

    await act(async () => {
      renderGoGoTrackScreen({ mode: "permissions", detector });
    });

    expect(screen.getByText("Usage access disclosure")).toBeTruthy();
    expect(screen.getByText("Enable all GoGoTrack permissions")).toBeTruthy();
    expect(screen.getByText("Grant usage access")).toBeTruthy();
  });

  it("android + ungranted > shows a grant control that opens usage-access settings", async () => {
    const detector = spyDetector();

    await act(async () => {
      renderGoGoTrackScreen({ mode: "permissions", detector });
    });

    const button = screen.getByText("Grant usage access");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(detector.openUsageAccessSettings).toHaveBeenCalledOnce();
  });

  it("default (unsupported, iOS/web) > shows no grant control", async () => {
    await act(async () => {
      renderGoGoTrackScreen({ mode: "permissions" });
    });

    expect(screen.queryByText("Grant usage access")).toBeNull();
  });

  it("permissions mode > does not surface notification-listener grant copy", async () => {
    await act(async () => {
      renderGoGoTrackScreen({ mode: "permissions" });
    });

    expect(screen.queryByText("Notification listener matching")).toBeNull();
    expect(screen.queryByText("Notification listener")).toBeNull();
  });
});

function cashbackNotificationsCard() {
  const title = screen.getByText("Cashback notifications");
  return title.parentElement?.parentElement as HTMLElement;
}

describe("GoGoTrack hub overview (render)", () => {
  it("hub mode > renders grant section without timeline empty-state copy", async () => {
    const detector = spyDetector();

    await act(async () => {
      renderGoGoTrackScreen({ mode: "hub", detector });
    });

    expect(screen.getByText("Enable all GoGoTrack permissions")).toBeTruthy();
    expect(screen.getByText("Tracking permissions")).toBeTruthy();
    expect(
      screen.queryByText(
        "Sign in and open a supported store to see live sessions here.",
      ),
    ).toBeNull();
  });

  it("web preview without usage access > allows toggling cashback notifications preference", async () => {
    await act(async () => {
      renderGoGoTrackScreen({ mode: "hub" });
    });

    expect(
      screen.getByText(
        "Turn permissions on or off below. Preferences save to your account; native cashback alerts need the Android app with Usage Access granted.",
      ),
    ).toBeTruthy();

    const toggle = screen.getByLabelText("Cashback notifications");
    expect(toggle.getAttribute("aria-disabled")).not.toBe("true");
    expect(
      screen.queryByText("Grant Usage Access first to enable cashback notifications."),
    ).toBeNull();
    expect(within(cashbackNotificationsCard()).getByText("Off")).toBeTruthy();

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(within(cashbackNotificationsCard()).getByText("On")).toBeTruthy();
  });

  it("android without usage access > toggle-on opens usage access settings without saving preference", async () => {
    const detector = spyDetector();

    await act(async () => {
      renderGoGoTrackScreen({ mode: "hub", detector });
    });

    const toggle = screen.getByLabelText("Cashback notifications");
    expect(toggle.getAttribute("aria-disabled")).not.toBe("true");

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(detector.openUsageAccessSettings).toHaveBeenCalledOnce();
    expect(within(cashbackNotificationsCard()).getByText("Off")).toBeTruthy();
  });

  it("web preview > enable all hero enables cashback notification preference", async () => {
    await act(async () => {
      renderGoGoTrackScreen({ mode: "hub" });
    });

    expect(within(cashbackNotificationsCard()).getByText("Off")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText("Enable all GoGoTrack permissions"));
    });

    expect(within(cashbackNotificationsCard()).getByText("On")).toBeTruthy();
  });
});

describe("GoGoTrack settings screen (render)", () => {
  it("settings mode > does not surface the deferred notification-listener control", async () => {
    await act(async () => {
      renderGoGoTrackScreen({ mode: "settings" });
    });

    expect(screen.queryByText("Notification listener matching")).toBeNull();
    expect(
      screen.queryByText(
        "Not available in this preview yet. Shopee detection uses Usage Access and cashback notifications only.",
      ),
    ).toBeNull();
    expect(screen.getByText("Usage access detection")).toBeTruthy();
    expect(screen.getByText("PII minimization")).toBeTruthy();
  });
});
