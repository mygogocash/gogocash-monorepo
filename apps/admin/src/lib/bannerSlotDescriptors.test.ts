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

  it("shows only the three wired slides for the All Brands page target", () => {
    expect(getBannerSlotDescriptors("allBrand")).toEqual([
      {
        area: "All Brands page carousel",
        label: "Slide No. 1",
        slot: 1,
      },
      {
        area: "All Brands page carousel",
        label: "Slide No. 2",
        slot: 2,
      },
      {
        area: "All Brands page carousel",
        label: "Slide No. 3",
        slot: 3,
      },
    ]);
  });

  it("does not resurrect the mock-only homeSmall surface", () => {
    expect(getBannerSlotDescriptors("homeSmall")).toEqual([]);
  });
});
