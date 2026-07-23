import { describe, expect, it } from "vitest";

import { getBannerSlotDescriptors } from "./bannerSlotDescriptors";

describe("getBannerSlotDescriptors", () => {
  it("labels homepage slots by the customer placement contract", () => {
    expect(getBannerSlotDescriptors("home")).toEqual([
      {
        area: "Top homepage sliding carousel",
        label: "Top carousel slide No. 1",
        slot: 1,
      },
      {
        area: "Top homepage sliding carousel",
        label: "Top carousel slide No. 2",
        slot: 2,
      },
      {
        area: "Top homepage sliding carousel",
        label: "Top carousel slide No. 3",
        slot: 3,
      },
      {
        area: "Below the carousel, left position",
        label: "Lower small banner No. 1 (left)",
        slot: 4,
      },
      {
        area: "Below the carousel, right position",
        label: "Lower small banner No. 2 (right)",
        slot: 5,
      },
    ]);
  });

  it.each([
    ["all-brands", "All Brands"],
    ["all-shops", "All Shops"],
    ["product-discovery", "Product Discovery"],
  ] as const)("shows three wired slides for %s", (target, label) => {
    expect(getBannerSlotDescriptors(target)).toEqual(
      [1, 2, 3].map((slot) => ({
        area: `${label} page carousel`,
        label: `Slide No. ${slot}`,
        slot,
      })),
    );
  });

  it("does not resurrect the mock-only homeSmall surface", () => {
    expect(getBannerSlotDescriptors("homeSmall")).toEqual([]);
  });
});
