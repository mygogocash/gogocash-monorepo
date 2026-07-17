import { describe, expect, it } from "vitest";

import {
  getSpecificPageBannerConfig,
  mapBackendSpecificPagePromo,
  resolveSpecificPagePromo,
  type SpecificPageBannerRouteId,
} from "@mobile/account/specificPageBannerResource";
import { webShopDirectory } from "@mobile/design/webDesignParity";

const cases = [
  {
    accessibilityLabel: "All Brands promotion 1",
    id: "all-brands-banner-1",
    resourceId: "allBrandBanner",
    routeId: "brand",
    target: "all-brands",
  },
  {
    accessibilityLabel: "All Shops promotion 1",
    id: "all-shops-banner-1",
    resourceId: "allShopBanner",
    routeId: "shops",
    target: "all-shops",
  },
  {
    accessibilityLabel: "Product Discovery promotion 1",
    id: "product-discovery-banner-1",
    resourceId: "productDiscoveryBanner",
    routeId: "discover",
    target: "product-discovery",
  },
] as const;

describe("specific page banner target contract", () => {
  it.each(cases)("maps $routeId to its isolated API target and resource", (expected) => {
    expect(getSpecificPageBannerConfig(expected.routeId)).toMatchObject({
      resourceId: expected.resourceId,
      target: expected.target,
    });
  });

  it.each(cases)("maps active backend slots for $target with target-specific identity", (expected) => {
    const promo = mapBackendSpecificPagePromo(expected.routeId, {
      image_1: "https://cdn.example/banner-1.png",
      link_1: " /category/Travel ",
      image_2: "https://cdn.example/disabled.png",
      enabled_2: false,
      image_4: "https://cdn.example/legacy-side.png",
    });

    expect(promo?.slides).toEqual([
      {
        accessibilityLabel: expected.accessibilityLabel,
        href: "/category/Travel",
        id: expected.id,
        imageUri: "https://cdn.example/banner-1.png",
        slot: 1,
      },
    ]);
  });

  it("keeps blank links image-only and ignores legacy slots four and five", () => {
    const promo = mapBackendSpecificPagePromo("shops", {
      image_1: "https://cdn.example/banner-1.png",
      link_1: "   ",
      image_3: "https://cdn.example/banner-3.png",
      image_4: "https://cdn.example/legacy-side.png",
      image_5: "https://cdn.example/legacy-side-2.png",
    });

    expect(promo?.slides).toEqual([
      {
        accessibilityLabel: "All Shops promotion 1",
        id: "all-shops-banner-1",
        imageUri: "https://cdn.example/banner-1.png",
        slot: 1,
      },
      {
        accessibilityLabel: "All Shops promotion 3",
        id: "all-shops-banner-3",
        imageUri: "https://cdn.example/banner-3.png",
        slot: 3,
      },
    ]);
  });

  it("returns null when the backend has no active page slides", () => {
    expect(mapBackendSpecificPagePromo("discover", null)).toBeNull();
    expect(
      mapBackendSpecificPagePromo("discover", {
        image_1: "https://cdn.example/disabled.png",
        enabled_1: false,
      }),
    ).toBeNull();
  });

  it("uses fixtures only for fixture mode and never over an empty backend response", () => {
    const fixture = webShopDirectory.promo;

    expect(resolveSpecificPagePromo("brand", "fixtures", null, fixture)).toBe(fixture);
    expect(resolveSpecificPagePromo("brand", "backend", null, fixture)).toBeNull();
    expect(resolveSpecificPagePromo("brand", "disabled", null, fixture)).toBeNull();
  });

  it("accepts every discovery route supported by the shared hook", () => {
    const routeIds: SpecificPageBannerRouteId[] = ["brand", "shops", "discover"];
    expect(routeIds.map((routeId) => getSpecificPageBannerConfig(routeId).target)).toEqual([
      "all-brands",
      "all-shops",
      "product-discovery",
    ]);
  });
});
