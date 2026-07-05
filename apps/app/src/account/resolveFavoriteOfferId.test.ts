import { describe, expect, it } from "vitest";

import { resolveFavoriteOfferId } from "@mobile/account/resolveFavoriteOfferId";

describe("resolveFavoriteOfferId", () => {
  it("prefers explicit id", () => {
    expect(
      resolveFavoriteOfferId({
        id: "offer-abc",
        href: "/shop/other-id",
        brand: "Other Brand",
      }),
    ).toBe("offer-abc");
  });

  it("parses id from /shop href when id is absent", () => {
    expect(
      resolveFavoriteOfferId({
        href: "/shop/brand-grocery-galaxy-1001",
        brand: "Grocery Galaxy",
      }),
    ).toBe("brand-grocery-galaxy-1001");
  });

  it("falls back to fixture brand slug mapping from brand name", () => {
    expect(resolveFavoriteOfferId({ brand: "Grocery Galaxy" })).toBe(
      "brand-grocery-galaxy-1001",
    );
    expect(resolveFavoriteOfferId({ brand: "Glow Theory" })).toBe("brand-glow-theory-1005");
  });
});
