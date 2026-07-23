import { createElement } from "react";
import { Animated } from "react-native";
import { render } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CarouselRail } from "@mobile/components/CarouselRail";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// #498 — the brand rails scroll as one continuous group now, so a proportional progress
// line replaces dot pagination. Dots stay on the genuinely paged surfaces.
describe("CarouselRail (#498)", () => {
  const rail = (props: Record<string, unknown> = {}) =>
    render(
      createElement(CarouselRail, {
        scrollX: new Animated.Value(0),
        contentWidth: 1200,
        visibleWidth: 400,
        color: "#00CC99",
        ...props,
      } as never),
    );

  it("given content wider than the frame > then it renders a track and a thumb", () => {
    const { container } = rail();
    expect(container.querySelectorAll("div").length).toBeGreaterThanOrEqual(2);
  });

  it("given content that already fits > then it renders nothing", () => {
    const { container } = rail({ contentWidth: 300, visibleWidth: 400 });
    expect(container.querySelector("div")).toBeNull();
  });

  it("given a zero content width > then it renders nothing rather than dividing by zero", () => {
    const { container } = rail({ contentWidth: 0 });
    expect(container.querySelector("div")).toBeNull();
  });

  it("given the implementation > then it animates transform, never width", () => {
    // Same compositor-friendly constraint perf-wave4 pins for CarouselDots: animating
    // width would lay out every frame.
    const source = fs.readFileSync(path.join(root, "src/components/CarouselRail.tsx"), "utf8");
    expect(source).toContain("transform: [{ translateX }]");
    expect(source).not.toMatch(/width:\s*scrollX\.interpolate/);
  });

  it("given CarouselDots > then it is untouched by this change", () => {
    // It is shared with HomeHeroBanners and the discovery banner carousel.
    const dots = fs.readFileSync(path.join(root, "src/components/CarouselDots.tsx"), "utf8");
    expect(dots).toContain("export function CarouselDots");
  });
});
