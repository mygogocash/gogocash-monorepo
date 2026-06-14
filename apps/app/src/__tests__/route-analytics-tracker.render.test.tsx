import { createElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RouteAnalyticsTracker } from "@mobile/analytics/RouteAnalyticsTracker";

// Render coverage for the analytics route tracker (audit #2 + closing the gap left
// by analytics slice 2: the tracker's logic was unit-tested but the COMPONENT was
// never mounted). This mounts it under the render harness (react-native ->
// react-native-web, happy-dom; expo-router + posthog-react-native stubbed). The
// tracker renders null and must mount cleanly without a PostHog provider — the
// production "no key configured" path, where useAnalytics() returns null and the
// event helpers no-op (so no throw even though page_view "fires").
describe("RouteAnalyticsTracker (render)", () => {
  it("mounts without throwing and renders nothing (null component)", () => {
    const { container, unmount } = render(createElement(RouteAnalyticsTracker));
    // render-null tracker contributes no DOM of its own
    expect(container.textContent).toBe("");
    unmount();
  });

  it("does not throw when re-rendered (effect re-runs on the same path are safe)", () => {
    const { rerender, unmount } = render(createElement(RouteAnalyticsTracker));
    expect(() => rerender(createElement(RouteAnalyticsTracker))).not.toThrow();
    unmount();
  });

  it("mounts silently — no console.error from the effect or the no-op analytics path", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(createElement(RouteAnalyticsTracker));
    expect(spy).not.toHaveBeenCalled();
    unmount();
    spy.mockRestore();
  });
});
