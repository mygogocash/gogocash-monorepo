import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  pathImage: (p: string) => `resolved:${p}`,
}));

import type { BannerHome } from "@/interfaces/offer";
import {
  buildMainHeroSlides,
  buildSideBannerSlides,
  DEFAULT_MAIN_BANNER,
} from "./buildHomeBanners";

describe("buildMainHeroSlides", () => {
  it("returns default slide when data is undefined", () => {
    expect(buildMainHeroSlides(undefined)).toEqual([
      { image: DEFAULT_MAIN_BANNER, link: undefined },
    ]);
  });

  it("uses main_slides when valid", () => {
    const data = {
      ...minimalBanner(),
      main_slides: [
        { image: "a.jpg", link: "/a" },
        { image: "  ", link: "/b" },
        { image: "b.jpg", link: null },
      ],
    } as BannerHome;
    expect(buildMainHeroSlides(data)).toEqual([
      { image: "resolved:a.jpg", link: "/a" },
      { image: "resolved:b.jpg", link: undefined },
    ]);
  });

  it("falls back to legacy image_1–3 when main_slides empty after filter", () => {
    const data = {
      ...minimalBanner(),
      main_slides: [{ image: "", link: "/x" }],
      image_1: "one.png",
      link_1: "/1",
      image_2: "",
      image_3: "three.png",
    } as BannerHome;
    expect(buildMainHeroSlides(data)).toEqual([
      { image: "resolved:one.png", link: "/1" },
      { image: "resolved:three.png", link: undefined },
    ]);
  });

  it("uses link_1 on default hero when legacy images empty", () => {
    const data = { ...minimalBanner(), link_1: "/home" } as BannerHome;
    expect(buildMainHeroSlides(data)).toEqual([{ image: DEFAULT_MAIN_BANNER, link: "/home" }]);
  });
});

describe("buildSideBannerSlides", () => {
  it("returns empty when no side images", () => {
    expect(buildSideBannerSlides(undefined)).toEqual([]);
    expect(buildSideBannerSlides({ ...minimalBanner() } as BannerHome)).toEqual([]);
  });

  it("includes only filled image_4 / image_5", () => {
    const data = {
      ...minimalBanner(),
      image_4: "s4.webp",
      link_4: "/s4",
      image_5: "",
      link_5: "/ignored",
    } as BannerHome;
    expect(buildSideBannerSlides(data)).toEqual([{ image: "resolved:s4.webp", link: "/s4" }]);
  });

  it("returns two slides when both set", () => {
    const data = {
      ...minimalBanner(),
      image_4: "a.png",
      image_5: "b.png",
      link_5: "/b",
    } as BannerHome;
    expect(buildSideBannerSlides(data)).toEqual([
      { image: "resolved:a.png", link: undefined },
      { image: "resolved:b.png", link: "/b" },
    ]);
  });
});

function minimalBanner(): Partial<BannerHome> {
  return {
    image_1: "",
    image_2: "",
    image_3: "",
    image_4: "",
    image_5: "",
    link_1: "",
    link_2: "",
    link_3: "",
    link_4: "",
    link_5: "",
  };
}
