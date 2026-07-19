import { createElement } from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MobileSession } from "@mobile/auth/session";

// Behavioral render coverage for the client identity bridge (Phase B). The bridge
// must call posthog.identify(user._id, safeProps) once a session becomes
// authenticated (so client + server events stitch onto the same person) and
// posthog.reset() on sign-out. Nothing calls identify today, so this is RED first.
//
// We inject a spy analytics client via useAnalytics, and drive the session via a
// mutable snapshot the mocked useMobileSessionSnapshot reads. useLocale resolves
// through the LocaleProvider the render harness always mounts (locale "en").

const identify = vi.fn();
const reset = vi.fn();
const capture = vi.fn();

let currentSession: MobileSession | null = null;

vi.mock("@mobile/analytics/useAnalytics", () => ({
  useAnalytics: () => ({ capture, identify, reset }),
}));

vi.mock("@mobile/auth/useMobileSessionSnapshot", () => ({
  useMobileSessionSnapshot: () => currentSession,
}));

async function loadBridge() {
  const mod = await import("@mobile/analytics/AnalyticsIdentityBridge");
  return mod.AnalyticsIdentityBridge;
}

const authedSession: MobileSession = {
  access_token: "jwt-token",
  _id: "65f0c0ffee1234567890abcd", // Mongo user._id — matches the server distinct_id
  region: "TH",
  auth_flow: "login",
  provider: "firebase",
};

describe("AnalyticsIdentityBridge (render)", () => {
  beforeEach(() => {
    identify.mockClear();
    reset.mockClear();
    capture.mockClear();
    currentSession = null;
  });

  afterEach(() => {
    currentSession = null;
  });

  it("mounts null and renders nothing", async () => {
    const AnalyticsIdentityBridge = await loadBridge();
    const { container, unmount } = render(createElement(AnalyticsIdentityBridge));
    expect(container.textContent).toBe("");
    unmount();
  });

  it("calls identify with the backend user._id and PDPA-safe person props when authenticated", async () => {
    currentSession = authedSession;
    const AnalyticsIdentityBridge = await loadBridge();
    const { unmount } = render(createElement(AnalyticsIdentityBridge));

    expect(identify).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledWith("65f0c0ffee1234567890abcd", {
      region: "TH",
      locale: "en",
      login_state: "authenticated",
      platform: "mobile",
      auth_flow: "login",
    });
    // Never leak PII into person props.
    const props = identify.mock.calls[0][1] as Record<string, unknown>;
    expect(props).not.toHaveProperty("email");
    expect(props).not.toHaveProperty("phone");
    expect(props).not.toHaveProperty("mobile");
    expect(props).not.toHaveProperty("username");
    unmount();
  });

  it("does NOT identify when authenticated without a backend _id (demo/dev token)", async () => {
    currentSession = { access_token: "demo-token", auth_flow: "phone", provider: "firebase" };
    const AnalyticsIdentityBridge = await loadBridge();
    const { unmount } = render(createElement(AnalyticsIdentityBridge));
    expect(identify).not.toHaveBeenCalled();
    unmount();
  });

  it("calls reset when the session clears after having identified (logout)", async () => {
    currentSession = authedSession;
    const AnalyticsIdentityBridge = await loadBridge();
    const { rerender, unmount } = render(createElement(AnalyticsIdentityBridge));
    expect(identify).toHaveBeenCalledTimes(1);

    // Simulate logout: session snapshot clears, component re-renders.
    currentSession = null;
    rerender(createElement(AnalyticsIdentityBridge));

    expect(reset).toHaveBeenCalledTimes(1);
    unmount();
  });
});
