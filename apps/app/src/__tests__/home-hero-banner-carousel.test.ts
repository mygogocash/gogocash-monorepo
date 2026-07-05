import { describe, expect, it } from "vitest";

import {
  buildLoopedHeroBannerSlides,
  getLoopedHeroBannerActiveIndex,
  getLoopedHeroBannerAutoAdvanceTarget,
  getLoopedHeroBannerDotScrollX,
  nextBannerIndex,
  normalizeBannerIndex,
  prevBannerIndex,
  resolveLoopedHeroBannerJumpTarget,
} from "@mobile/screens/home/homeHeroBannerCarousel";

describe("home hero banner carousel loop", () => {
  it("nextBannerIndex > given last slide of three > then wraps to first", () => {
    expect(nextBannerIndex(2, 3)).toBe(0);
  });

  it("prevBannerIndex > given first slide of three > then wraps to last", () => {
    expect(prevBannerIndex(0, 3)).toBe(2);
  });

  it("normalizeBannerIndex > given out-of-range values > then wraps within count", () => {
    expect(normalizeBannerIndex(-1, 3)).toBe(2);
    expect(normalizeBannerIndex(3, 3)).toBe(0);
  });

  it("buildLoopedHeroBannerSlides > given three banners > then clones first and last with start offset", () => {
    const banners = [{ id: "a" }, { id: "b" }, { id: "c" }] as const;

    expect(buildLoopedHeroBannerSlides(banners)).toEqual({
      slides: [{ id: "c" }, { id: "a" }, { id: "b" }, { id: "c" }, { id: "a" }],
      startIndex: 1,
    });
  });

  it("resolveLoopedHeroBannerJumpTarget > given clone edges > then returns real slide index", () => {
    expect(resolveLoopedHeroBannerJumpTarget(0, 3)).toBe(3);
    expect(resolveLoopedHeroBannerJumpTarget(4, 3)).toBe(1);
    expect(resolveLoopedHeroBannerJumpTarget(2, 3)).toBeNull();
  });

  it("getLoopedHeroBannerActiveIndex > given extended carousel index > then maps to dot index", () => {
    expect(getLoopedHeroBannerActiveIndex(1, 3)).toBe(0);
    expect(getLoopedHeroBannerActiveIndex(3, 3)).toBe(2);
    expect(getLoopedHeroBannerActiveIndex(4, 3)).toBe(0);
    expect(getLoopedHeroBannerActiveIndex(0, 3)).toBe(2);
  });

  it("getLoopedHeroBannerDotScrollX > given looped offsets > then keeps dot scroll within one lap", () => {
    const pageWidth = 720;

    expect(getLoopedHeroBannerDotScrollX(pageWidth, pageWidth, 3)).toBe(0);
    expect(getLoopedHeroBannerDotScrollX(pageWidth * 3, pageWidth, 3)).toBe(pageWidth * 2);
    expect(getLoopedHeroBannerDotScrollX(pageWidth * 4, pageWidth, 3)).toBe(0);
    expect(getLoopedHeroBannerDotScrollX(0, pageWidth, 3)).toBe(pageWidth * 2);
  });

  it("getLoopedHeroBannerAutoAdvanceTarget > given last real slide > then targets trailing clone", () => {
    expect(getLoopedHeroBannerAutoAdvanceTarget(2, 3)).toEqual({
      activeIndex: 0,
      extendedIndex: 4,
    });
    expect(getLoopedHeroBannerAutoAdvanceTarget(1, 3)).toEqual({
      activeIndex: 2,
      extendedIndex: 3,
    });
  });
});
