import { describe, expect, it } from "vitest";

import {
  type BannerHomeDocument,
  type HomeHeroBanner,
  mapBackendHomeBanners,
  resolveHomeHeroBanners,
} from "@mobile/account/homeBannerResource";

const FIXTURE_BANNERS: readonly HomeHeroBanner[] = [
  { id: "fixture-1", href: "/shop/a", placement: "main", asset: "home-banner" },
  { id: "fixture-2", href: "/shop/b", placement: "side", asset: "home-side-watch" },
];

describe("mapBackendHomeBanners", () => {
  it("given a null doc > then returns an empty list", () => {
    expect(mapBackendHomeBanners(null)).toEqual([]);
  });

  it("given a full 5-slot doc > then returns 3 main + 2 side banners in order", () => {
    const doc: BannerHomeDocument = {
      image_1: "https://cdn/b1.png",
      image_2: "https://cdn/b2.png",
      image_3: "https://cdn/b3.png",
      image_4: "https://cdn/b4.png",
      image_5: "https://cdn/b5.png",
      link_1: "/shop/1",
      link_2: "/shop/2",
      link_3: "/shop/3",
      link_4: "/shop/4",
      link_5: "/shop/5",
    };

    expect(mapBackendHomeBanners(doc)).toEqual([
      { id: "home-banner-1", href: "/shop/1", placement: "main", imageUri: "https://cdn/b1.png" },
      { id: "home-banner-2", href: "/shop/2", placement: "main", imageUri: "https://cdn/b2.png" },
      { id: "home-banner-3", href: "/shop/3", placement: "main", imageUri: "https://cdn/b3.png" },
      { id: "home-banner-4", href: "/shop/4", placement: "side", imageUri: "https://cdn/b4.png" },
      { id: "home-banner-5", href: "/shop/5", placement: "side", imageUri: "https://cdn/b5.png" },
    ]);
  });

  it("given empty image slots > then skips them but keeps original slot numbering", () => {
    const doc: BannerHomeDocument = {
      image_1: "https://cdn/b1.png",
      image_2: "",
      image_3: "https://cdn/b3.png",
      image_4: null,
      // image_5 missing entirely
      link_1: "/shop/1",
      link_3: "/shop/3",
    };

    expect(mapBackendHomeBanners(doc)).toEqual([
      { id: "home-banner-1", href: "/shop/1", placement: "main", imageUri: "https://cdn/b1.png" },
      { id: "home-banner-3", href: "/shop/3", placement: "main", imageUri: "https://cdn/b3.png" },
    ]);
  });

  it("given an image with no link > then falls back to href '/'", () => {
    const doc: BannerHomeDocument = {
      image_4: "https://cdn/b4.png",
      link_4: "",
    };

    expect(mapBackendHomeBanners(doc)).toEqual([
      { id: "home-banner-4", href: "/", placement: "side", imageUri: "https://cdn/b4.png" },
    ]);
  });

  it("given a backend file id image > then resolves it to a renderable remote image URL", () => {
    const doc: BannerHomeDocument = {
      image_1: "1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh",
      link_1: "/quest",
    };

    expect(mapBackendHomeBanners(doc)).toEqual([
      {
        id: "home-banner-1",
        href: "/quest",
        placement: "main",
        imageUri:
          "https://drive.google.com/uc?export=view&id=1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh",
      },
    ]);
  });

  it("given disabled slots > then excludes only disabled ones", () => {
    const doc: BannerHomeDocument = {
      image_1: "https://cdn/b1.png",
      enabled_1: false,
      image_2: "https://cdn/b2.png",
    };

    expect(mapBackendHomeBanners(doc)).toEqual([
      { id: "home-banner-2", href: "/", placement: "main", imageUri: "https://cdn/b2.png" },
    ]);
  });

  it("given null enabled slot values > then treats them as legacy enabled slots", () => {
    const doc: BannerHomeDocument = {
      image_1: "https://cdn/b1.png",
      enabled_1: null,
    };

    expect(mapBackendHomeBanners(doc)).toEqual([
      { id: "home-banner-1", href: "/", placement: "main", imageUri: "https://cdn/b1.png" },
    ]);
  });

  it("given a start date on the current local day > then includes the banner immediately", () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const doc: BannerHomeDocument = {
      image_1: "https://cdn/b1.png",
      link_1: "/shop/1",
      start_date_1: `${yyyy}-${mm}-${dd}`,
    };

    expect(mapBackendHomeBanners(doc)).toEqual([
      { id: "home-banner-1", href: "/shop/1", placement: "main", imageUri: "https://cdn/b1.png" },
    ]);
  });

  it("given per-slot date windows > then includes only active slots", () => {
    const now = new Date();
    const soonStarted = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const ended = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const later = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const doc: BannerHomeDocument = {
      image_1: "https://cdn/b1.png",
      image_2: "https://cdn/b2.png",
      image_4: "https://cdn/b4.png",
      start_date_1: later,
      end_date_2: ended,
      start_date_4: soonStarted,
      end_date_4: later,
      link_4: "/shop/4",
      link_1: "/shop/1",
    };

    expect(mapBackendHomeBanners(doc)).toEqual([
      {
        id: "home-banner-4",
        href: "/shop/4",
        placement: "side",
        imageUri: "https://cdn/b4.png",
      },
    ]);
  });

  it("given missing slot date fields > then uses document-level start_date/end_date as fallback", () => {
    const now = new Date();
    const legacyStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const legacyEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const doc: BannerHomeDocument = {
      image_1: "https://cdn/b1.png",
      image_2: "https://cdn/b2.png",
      link_2: "/shop/2",
      start_date: legacyStart,
      end_date: legacyEnd,
    };

    expect(mapBackendHomeBanners(doc)).toEqual([
      { id: "home-banner-1", href: "/", placement: "main", imageUri: "https://cdn/b1.png" },
      { id: "home-banner-2", href: "/shop/2", placement: "main", imageUri: "https://cdn/b2.png" },
    ]);
  });
});

describe("resolveHomeHeroBanners", () => {
  it("given fixtures source > then returns the bundled fallback", () => {
    expect(resolveHomeHeroBanners("fixtures", null, FIXTURE_BANNERS)).toEqual(FIXTURE_BANNERS);
  });

  it("given disabled source > then returns the bundled fallback", () => {
    expect(resolveHomeHeroBanners("disabled", null, FIXTURE_BANNERS)).toEqual(FIXTURE_BANNERS);
  });

  it("given backend source with a configured doc > then returns the mapped backend banners", () => {
    const doc: BannerHomeDocument = {
      image_1: "https://cdn/b1.png",
      link_1: "/shop/1",
    };

    expect(resolveHomeHeroBanners("backend", doc, FIXTURE_BANNERS)).toEqual([
      { id: "home-banner-1", href: "/shop/1", placement: "main", imageUri: "https://cdn/b1.png" },
    ]);
  });

  it("given backend source with a null doc > then returns empty because backend config is authoritative", () => {
    expect(resolveHomeHeroBanners("backend", null, FIXTURE_BANNERS)).toEqual([]);
  });

  it("given backend source with no configured images > then returns empty because admin has no visible banners", () => {
    const doc: BannerHomeDocument = { link_1: "/shop/1" };

    expect(resolveHomeHeroBanners("backend", doc, FIXTURE_BANNERS)).toEqual([]);
  });

  it("given backend source with only inactive configured banners > then returns empty instead of fixtures", () => {
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const doc: BannerHomeDocument = {
      image_1: "https://cdn/b1.png",
      link_1: "/shop/1",
      start_date_1: later,
      image_2: "https://cdn/b2.png",
      link_2: "/shop/2",
      enabled_2: false,
    };

    expect(resolveHomeHeroBanners("backend", doc, FIXTURE_BANNERS)).toEqual([]);
  });
});
