import { describe, expect, it } from "vitest";

import {
  formatXtraCashback,
  mapExploreShopsToDirectoryStores,
} from "@mobile/account/exploreShopsResource";

describe("formatXtraCashback", () => {
  it("renders a fractional rate as a percent", () => {
    expect(formatXtraCashback(0.015)).toBe("1.5%");
    expect(formatXtraCashback(0.0325)).toBe("3.25%");
    expect(formatXtraCashback(0.1)).toBe("10%");
  });
  it("returns empty for missing/zero/invalid rates", () => {
    expect(formatXtraCashback(0)).toBe("");
    expect(formatXtraCashback(undefined)).toBe("");
    expect(formatXtraCashback(Number.NaN)).toBe("");
  });
});

describe("mapExploreShopsToDirectoryStores (REQ-APP-2)", () => {
  it("maps rows into the BrandDirectoryStore shape with the Xtra flag", () => {
    const stores = mapExploreShopsToDirectoryStores({
      data: [
        {
          shopId: 1001,
          shopName: "Alpha Mall Store",
          shopType: "mall",
          shopImage: "https://cf/alpha",
          cashbackRate: 0.015,
          trackingLink: "https://invl.me/alpha",
          offerId: "offer-abc",
          country: "Thailand",
        },
      ],
    });
    expect(stores).toHaveLength(1);
    expect(stores[0]).toMatchObject({
      brand: "Alpha Mall Store",
      cashback: "1.5%",
      href: "/shop/offer-abc",
      id: "xtra-1001",
      isXtra: true,
      logoUri: "https://cf/alpha",
      shopType: "normal",
    });
  });

  it("falls back to the external shop link when no parent offer resolved", () => {
    const stores = mapExploreShopsToDirectoryStores({
      data: [
        {
          shopId: 2,
          shopName: "Orphan Shop",
          cashbackRate: 0.02,
          shopLink: "https://shopee.co.th/orphan",
          offerId: null,
        },
      ],
    });
    expect(stores[0].href).toBe("https://shopee.co.th/orphan");
  });

  it("skips rows with no name, no cashback, or no usable href; empty payload -> []", () => {
    expect(mapExploreShopsToDirectoryStores(null)).toEqual([]);
    expect(mapExploreShopsToDirectoryStores({ data: [] })).toEqual([]);
    const stores = mapExploreShopsToDirectoryStores({
      data: [
        { shopId: 1, cashbackRate: 0.02, offerId: "x" }, // no name
        { shopId: 2, shopName: "No Rate", offerId: "y" }, // no cashback
        { shopId: 3, shopName: "No Href", cashbackRate: 0.02 }, // no offerId + no shopLink
      ],
    });
    expect(stores).toEqual([]);
  });
});
