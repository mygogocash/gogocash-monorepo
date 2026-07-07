import { describe, expect, it } from "vitest";

import {
  resolvePublicOfferLogo,
  resolveShopPageBannerUri,
} from "@mobile/api/offerLogo";

describe("offerLogo > resolvePublicOfferLogo", () => {
  it("given logo_desktop > then prefers it over legacy logo", () => {
    expect(
      resolvePublicOfferLogo({
        logo_desktop: "https://cdn.example/desktop.png",
        logo: "https://cdn.example/legacy.png",
      })
    ).toBe("https://cdn.example/desktop.png");
  });

  it("given only logo_circle and logo > then uses circle before legacy", () => {
    expect(
      resolvePublicOfferLogo({
        logo_circle: "https://cdn.example/circle.png",
        logo: "https://cdn.example/legacy.png",
      })
    ).toBe("https://cdn.example/circle.png");
  });
});

describe("offerLogo > resolveShopPageBannerUri", () => {
  it("given banner and logo_circle > then prefers banner", () => {
    expect(
      resolveShopPageBannerUri({
        banner: "https://cdn.example/banner.png",
        logo_circle: "https://cdn.example/cover.png",
      })
    ).toBe("https://cdn.example/banner.png");
  });

  it("given no banner > then falls back to logo_circle brand cover", () => {
    expect(
      resolveShopPageBannerUri({
        banner: "",
        logo_circle: "https://cdn.example/cover.png",
      })
    ).toBe("https://cdn.example/cover.png");
  });
});
