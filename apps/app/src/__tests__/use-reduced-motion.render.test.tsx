import { createElement } from "react";
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Render-suite coverage for A1 (reduce-motion support). useReducedMotion imports
// react-native (aliased to react-native-web here), so it belongs in the render
// suite, not the source-string suite. We mock react-native's AccessibilityInfo so
// the platform flag + listener lifecycle are deterministic (RNW's real impl reads
// happy-dom matchMedia, which we cannot toggle per-test).
//
// The mock keeps every other react-native export real (Pressable/StyleSheet/etc.)
// so MotionPressable still renders against react-native-web.

const remove = vi.fn();
const addEventListener = vi.fn(() => ({ remove }));
let reduceMotionFlag = false;

vi.mock("react-native", async () => {
  const actual = await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      isReduceMotionEnabled: () => Promise.resolve(reduceMotionFlag),
      addEventListener,
    },
  };
});

// Imported AFTER the mock is registered (vi.mock is hoisted, so this is safe).
const { useReducedMotion } = await import("@mobile/hooks/useReducedMotion");
const { MotionPressable } = await import("@mobile/components/MotionPressable");

beforeEach(() => {
  // Start each test from a clean slate. renderHook trees from a prior test are
  // not torn down by render's cleanup(), so clearing here (not afterEach) keeps
  // the per-test add/remove call counts isolated.
  reduceMotionFlag = false;
  remove.mockClear();
  addEventListener.mockClear();
});

describe("useReducedMotion", () => {
  it("returns false by default (platform flag off)", async () => {
    reduceMotionFlag = false;
    const { result } = renderHook(() => useReducedMotion());
    // Resolves after the async isReduceMotionEnabled() promise settles.
    await vi.waitFor(() => expect(result.current).toBe(false));
  });

  it("returns true when the platform reduce-motion flag is set", async () => {
    reduceMotionFlag = true;
    const { result } = renderHook(() => useReducedMotion());
    await vi.waitFor(() => expect(result.current).toBe(true));
  });

  it("removes the reduceMotionChanged listener on unmount (no leak)", async () => {
    const { unmount } = renderHook(() => useReducedMotion());
    await vi.waitFor(() => expect(addEventListener).toHaveBeenCalled());
    unmount();
    // No leak: every subscription created by addEventListener has had remove()
    // called. (StrictMode may mount/cleanup/remount, so assert balance + that
    // the listener was actually torn down, not an exact call count of 1.)
    expect(remove).toHaveBeenCalled();
    expect(remove.mock.calls.length).toBe(addEventListener.mock.calls.length);
  });
});

describe("MotionPressable with reduced motion", () => {
  it("still fires onPress when reduce-motion is on", async () => {
    reduceMotionFlag = true;
    const onPress = vi.fn();
    render(
      createElement(MotionPressable, { onPress }, "Tap me"),
    );
    fireEvent.click(screen.getByText("Tap me"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
