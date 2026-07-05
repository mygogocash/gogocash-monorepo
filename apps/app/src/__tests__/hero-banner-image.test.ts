import { PixelRatio } from "react-native";
import { describe, expect, it, vi } from "vitest";

import {
  HOME_HERO_BANNER_CONTENT_FIT,
  HOME_HERO_BANNER_DESIGN_HEIGHT,
  HOME_HERO_BANNER_DESIGN_WIDTH,
  getHeroBannerLayoutPixelBudget,
  resolveHeroBannerRemoteImageSource,
} from "../lib/heroBannerImage";

vi.mock("../screens/home/homeAssets", () => ({
  heroBannerAssets: {
    "home-promo-black-friday": 1,
  },
}));

import { resolveHeroBannerImageSource } from "../screens/home/homeHelpers";

describe("resolveHeroBannerRemoteImageSource", () => {
  it("resolveHeroBannerRemoteImageSource > given backend banner URL > then attaches 1920x1080 design metadata", () => {
    expect(
      resolveHeroBannerRemoteImageSource(
        "https://media-staging.gogocash.co/banner-home/hero.png",
      ),
    ).toEqual({
      uri: "https://media-staging.gogocash.co/banner-home/hero.png",
      width: HOME_HERO_BANNER_DESIGN_WIDTH,
      height: HOME_HERO_BANNER_DESIGN_HEIGHT,
    });
  });
});

describe("resolveHeroBannerImageSource", () => {
  it("resolveHeroBannerImageSource > given bundled fixture asset > then returns local require source", () => {
    const source = resolveHeroBannerImageSource({
      id: "main-grocery-galaxy",
      href: "/shop/brand-grocery-galaxy-1001",
      placement: "main",
      asset: "home-promo-black-friday",
    });

    expect(source).toBeTruthy();
    expect(typeof source).toBe("number");
  });
});

describe("getHeroBannerLayoutPixelBudget", () => {
  it("getHeroBannerLayoutPixelBudget > given css width and 2x density > then scales width by pixel ratio", () => {
    vi.spyOn(PixelRatio, "get").mockReturnValue(2);

    expect(getHeroBannerLayoutPixelBudget(734)).toEqual({
      width: 1468,
      height: 826,
    });

    vi.restoreAllMocks();
  });
});

describe("HOME_HERO_BANNER_CONTENT_FIT", () => {
  it("HOME_HERO_BANNER_CONTENT_FIT > is scale-down so low-res art is not upscaled", () => {
    expect(HOME_HERO_BANNER_CONTENT_FIT).toBe("scale-down");
  });
});
