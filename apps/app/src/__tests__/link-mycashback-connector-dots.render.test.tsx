import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Make the reduce-motion preference controllable so we can exercise both the animated
// branch (dots are Animated.Views with a looping pulse) and the static branch.
const { mockReduced } = vi.hoisted(() => ({ mockReduced: vi.fn<() => boolean>(() => false) }));
vi.mock("@mobile/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReduced(),
}));

import { LinkMyCashbackConnectorDots } from "@mobile/components/LinkMyCashbackConnectorDots";

const COLORS = ["#5E8F9C", "#3BAFAA", "#55D5CE", "#83F2D6"] as const;

describe("LinkMyCashbackConnectorDots", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockReduced.mockReturnValue(false);
  });

  it("renders one dot per color inside the testID container (animated)", () => {
    mockReduced.mockReturnValue(false);
    render(
      createElement(LinkMyCashbackConnectorDots, {
        colors: COLORS,
        testID: "link-mycashback-connector-dots",
      }),
    );

    const container = screen.getByTestId("link-mycashback-connector-dots");
    expect(container).toBeTruthy();
    expect(container.children.length).toBe(COLORS.length);
    // Each dot keeps its gradient color.
    const backgrounds = Array.from(container.children).map(
      (child) => (child as HTMLElement).style.backgroundColor,
    );
    expect(backgrounds.every((bg) => bg.length > 0)).toBe(true);
  });

  it("still renders every dot when reduce-motion is enabled (static, no loop)", () => {
    mockReduced.mockReturnValue(true);
    render(
      createElement(LinkMyCashbackConnectorDots, {
        colors: COLORS,
        testID: "link-mycashback-connector-dots",
      }),
    );

    const container = screen.getByTestId("link-mycashback-connector-dots");
    expect(container.children.length).toBe(COLORS.length);
  });
});
