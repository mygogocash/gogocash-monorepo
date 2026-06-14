import { createElement } from "react";
import { Animated } from "react-native";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Render-suite coverage for A3 (skeleton primitives). Skeleton.tsx imports
// react-native (aliased to react-native-web here), so it belongs in the render
// suite, not the source-string suite. We mock A1's useReducedMotion so this test
// is independent of A1's async AccessibilityInfo plumbing — the skeleton's
// reduced-motion gating is the contract under test, so we drive the boolean
// directly and spy on Animated.loop to assert whether the pulse is started.
let reduceMotionFlag = false;
vi.mock("@mobile/hooks/useReducedMotion", () => ({
  useReducedMotion: () => reduceMotionFlag,
}));

const { Skeleton, SkeletonText, WalletSkeleton } = await import("@mobile/components/Skeleton");

let loopSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  reduceMotionFlag = false;
  // Spy on the loop factory so we can assert the pulse is (not) started without
  // depending on RNW actually driving frames under happy-dom. Return a handle
  // with start/stop so the component's .start()/.stop() calls are safe no-ops.
  loopSpy = vi.spyOn(Animated, "loop").mockReturnValue({
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  } as unknown as Animated.CompositeAnimation);
});

afterEach(() => {
  loopSpy.mockRestore();
});

describe("Skeleton (render)", () => {
  it("mounts a placeholder block", () => {
    render(createElement(Skeleton, { testID: "skeleton-block" }));
    expect(screen.getByTestId("skeleton-block")).toBeTruthy();
  });

  it("hides the placeholder from screen readers", () => {
    render(createElement(Skeleton, { testID: "skeleton-a11y" }));
    // react-native-web maps importantForAccessibility="no-hide-descendants" ->
    // aria-hidden on the host node, so screen readers skip the placeholder.
    const node = screen.getByTestId("skeleton-a11y");
    expect(node.getAttribute("aria-hidden")).toBe("true");
  });

  it("starts the pulse loop when reduced motion is off", () => {
    reduceMotionFlag = false;
    render(createElement(Skeleton, { testID: "skeleton-animated" }));
    expect(loopSpy).toHaveBeenCalled();
  });

  it("does NOT start the pulse loop when reduced motion is on", () => {
    reduceMotionFlag = true;
    render(createElement(Skeleton, { testID: "skeleton-static" }));
    expect(loopSpy).not.toHaveBeenCalled();
  });
});

describe("SkeletonText (render)", () => {
  it("renders one block per line", () => {
    render(createElement(SkeletonText, { lines: 3, testID: "skeleton-text" }));
    // Each line is an individually-keyed placeholder line.
    expect(screen.getAllByTestId("skeleton-text-line")).toHaveLength(3);
  });
});

describe("WalletSkeleton (render)", () => {
  it("mounts the composite placeholder", () => {
    render(createElement(WalletSkeleton, { testID: "wallet-skeleton" }));
    expect(screen.getByTestId("wallet-skeleton")).toBeTruthy();
  });
});
