import { describe, expect, it } from "vitest";

import {
  mapBackendAllBrandPromo,
  resolveAllBrandPromo,
} from "@mobile/account/allBrandBannerResource";
import { webBrandDirectory } from "@mobile/design/webDesignParity";

describe("all brand banner resource", () => {
  it("maps active backend slots into directory promo slides", () => {
    const promo = mapBackendAllBrandPromo({
      image_1: "https://cdn.example/brands-1.png",
      link_1: "/brand/one",
      image_2: "https://cdn.example/disabled.png",
      enabled_2: false,
    });

    expect(promo?.slides).toEqual([
      {
        accessibilityLabel: "All Brands promotion 1",
        href: "/brand/one",
        id: "all-brand-banner-1",
        imageUri: "https://cdn.example/brands-1.png",
      },
    ]);
  });

  it("keeps fixtures before live data resolves but hides them for an empty backend config", () => {
    expect(
      resolveAllBrandPromo("fixtures", null, webBrandDirectory.promo),
    ).toBe(webBrandDirectory.promo);
    expect(resolveAllBrandPromo("backend", null, webBrandDirectory.promo)).toBeNull();
  });
});
