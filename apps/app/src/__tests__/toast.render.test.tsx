import { createElement, useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Render-suite coverage for A7 (toast / action feedback). Toast.tsx + useToast
// import react-native (aliased to react-native-web here), so this belongs in the
// render suite. We mock A1's useReducedMotion so this test is independent of A1's
// async AccessibilityInfo plumbing — the toast's reduced-motion gating is A1's
// concern; here we only need a deterministic boolean so the host mounts.
let reduceMotionFlag = false;
vi.mock("@mobile/hooks/useReducedMotion", () => ({
  useReducedMotion: () => reduceMotionFlag,
}));

const { ToastProvider, TOAST_DEFAULT_DURATION_MS } = await import("@mobile/components/Toast");
const { useToast } = await import("@mobile/hooks/useToast");

// A tiny consumer that calls show(message) exactly once on mount, so the test can
// drive the provider through its public hook surface (not internal state).
function ShowOnce({ message }: { message: string }) {
  const { show } = useToast();
  useEffect(() => {
    show(message);
    // show is stable (useCallback in the provider); run-once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

beforeEach(() => {
  reduceMotionFlag = false;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("ToastProvider / useToast (render)", () => {
  it('show("Copied!") renders the message', () => {
    act(() => {
      render(
        createElement(ToastProvider, {}, createElement(ShowOnce, { message: "Copied!" }))
      );
    });
    expect(screen.getByText("Copied!")).toBeTruthy();
  });

  it("auto-dismisses the message after the default timeout", () => {
    act(() => {
      render(
        createElement(ToastProvider, {}, createElement(ShowOnce, { message: "Saved" }))
      );
    });
    expect(screen.getByText("Saved")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(TOAST_DEFAULT_DURATION_MS + 1);
    });
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it('mounts a live region with accessibilityLiveRegion="polite"', () => {
    act(() => {
      render(
        createElement(ToastProvider, {}, createElement(ShowOnce, { message: "Copied!" }))
      );
    });
    // react-native-web maps accessibilityLiveRegion -> aria-live on the host node.
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.textContent).toContain("Copied!");
  });
});
