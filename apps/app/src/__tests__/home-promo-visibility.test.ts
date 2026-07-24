import { describe, expect, it } from "vitest";

import { filterHomePromoSectionsForSurface } from "@mobile/screens/home/homePromoVisibility";

const sections = [
  { id: "trending", title: "Trending Brands" },
  { id: "travel", title: "Travel Deals are Here!" },
  { id: "makeup", title: "Makeup Must Have!" },
] as const;

describe("home promo visibility", () => {
  it("hides the Travel and Makeup rails on the beta production hostname", () => {
    expect(
      filterHomePromoSectionsForSurface(sections, {
        currentHostname: "beta.gogocash.co",
        frontendUrl: "https://app-staging.gogocash.co",
      }),
    ).toEqual([sections[0]]);
  });

  it("hides the Travel and Makeup rails on the canonical production hostname", () => {
    expect(
      filterHomePromoSectionsForSurface(sections, {
        currentHostname: "app.gogocash.co",
        frontendUrl: "https://app-staging.gogocash.co",
      }),
    ).toEqual([sections[0]]);
  });

  it("keeps the rails on staging even when another frontend URL was baked in", () => {
    expect(
      filterHomePromoSectionsForSurface(sections, {
        currentHostname: "app-staging.gogocash.co",
        frontendUrl: "https://beta.gogocash.co",
      }),
    ).toBe(sections);
  });

  it("uses the configured frontend URL when no browser hostname exists", () => {
    expect(
      filterHomePromoSectionsForSurface(sections, {
        frontendUrl: "https://beta.gogocash.co",
      }),
    ).toEqual([sections[0]]);
  });
});
