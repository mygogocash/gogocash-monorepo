import { describe, expect, it } from "vitest";

import {
  SPECIFIC_PAGE_BANNER_TARGET_IDS,
  SPECIFIC_PAGE_BANNER_TARGETS,
  specificPageBannerTargetFromParam,
} from "./bannerAdminSurfaces";

describe("specific page banner target registry", () => {
  it("defines the three customer page targets from one registry", () => {
    expect(SPECIFIC_PAGE_BANNER_TARGET_IDS).toEqual([
      "all-brands",
      "all-shops",
      "product-discovery",
    ]);

    expect(
      SPECIFIC_PAGE_BANNER_TARGET_IDS.map((id) => ({
        id,
        label: SPECIFIC_PAGE_BANNER_TARGETS[id].label,
        customerPath: SPECIFIC_PAGE_BANNER_TARGETS[id].customerPath,
        fetchPath: SPECIFIC_PAGE_BANNER_TARGETS[id].fetchPath,
        queryKey: SPECIFIC_PAGE_BANNER_TARGETS[id].queryKey,
        slots: SPECIFIC_PAGE_BANNER_TARGETS[id].slots.map(({ slot }) => slot),
      })),
    ).toEqual([
      {
        id: "all-brands",
        label: "All Brands",
        customerPath: "/brand",
        fetchPath: "/admin/banner-specific-page/all-brands",
        queryKey: ["banner", "specific-page", "all-brands"],
        slots: [1, 2, 3],
      },
      {
        id: "all-shops",
        label: "All Shops",
        customerPath: "/shops",
        fetchPath: "/admin/banner-specific-page/all-shops",
        queryKey: ["banner", "specific-page", "all-shops"],
        slots: [1, 2, 3],
      },
      {
        id: "product-discovery",
        label: "Product Discovery",
        customerPath: "/discover",
        fetchPath: "/admin/banner-specific-page/product-discovery",
        queryKey: ["banner", "specific-page", "product-discovery"],
        slots: [1, 2, 3],
      },
    ]);
  });

  it("uses All Brands as the safe default for missing or invalid URL values", () => {
    expect(specificPageBannerTargetFromParam(null)).toBe("all-brands");
    expect(specificPageBannerTargetFromParam("all-shops")).toBe("all-shops");
    expect(specificPageBannerTargetFromParam("unknown")).toBe("all-brands");
  });

  it("keeps API paths and query keys isolated", () => {
    const targets = SPECIFIC_PAGE_BANNER_TARGET_IDS.map(
      (id) => SPECIFIC_PAGE_BANNER_TARGETS[id],
    );
    expect(new Set(targets.map(({ fetchPath }) => fetchPath)).size).toBe(3);
    expect(
      new Set(targets.map(({ queryKey }) => queryKey.join("/"))).size,
    ).toBe(3);
  });
});
