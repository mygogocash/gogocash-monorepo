import { describe, expect, it } from "vitest";

import type { LiveCompactBrandCard } from "@mobile/account/brandCatalogResource";
import {
  BRAND_CATEGORY_TILE_LOGO_COUNT,
  resolveBrandCategoryTiles,
} from "@mobile/screens/home/brandCategoryTiles";

const card = (
  brand: string,
  category: string,
  cashback: string,
  logoUri?: string,
): LiveCompactBrandCard => ({
  brand,
  cashback,
  category,
  href: `/shop/${brand}`,
  logoUri,
  tint: "#123456",
});

const CATALOG: LiveCompactBrandCard[] = [
  card("Traveloka", "Travel", "9.8%", "https://cdn/traveloka.png"),
  card("Agoda", "Travel", "4.9%", "https://cdn/agoda.png"),
  card("Expedia", "Travel", "2.69%", "https://cdn/expedia.png"),
  card("Hotels.com", "Travel", "2.2%", "https://cdn/hotels.png"),
  card("Sephora", "Health & Beauty", "3.9%", "https://cdn/sephora.png"),
  card("Gowabi", "Health & Beauty", "4.9%", "https://cdn/gowabi.png"),
  card("iHerb", "Health & Beauty", "2.45%", "https://cdn/iherb.png"),
  card("Adidas", "Fashion", "2.94%", "https://cdn/adidas.png"),
  card("PUMA", "Fashion", "4.2%", "https://cdn/puma.png"),
  card("LG", "Electronics", "8.4%", "https://cdn/lg.png"),
  card("Xiaomi", "Electronics", "1.96%", "https://cdn/xiaomi.png"),
  card("Klook", "Digital Services", "14%", "https://cdn/klook.png"),
];

describe("brand category tiles", () => {
  it("resolveBrandCategoryTiles > given a catalogue > returns the four curated categories in order", () => {
    expect(resolveBrandCategoryTiles(CATALOG).map((tile) => tile.label)).toEqual([
      "Travel",
      "Health & Beauty",
      "Fashion",
      "Electronics",
    ]);
  });

  it("resolveBrandCategoryTiles > given more brands than fit > caps the logo cluster", () => {
    const travel = resolveBrandCategoryTiles(CATALOG)[0];

    // Travel has four brands; the cluster shows three.
    expect(travel.brandCount).toBe(4);
    expect(travel.logos).toHaveLength(BRAND_CATEGORY_TILE_LOGO_COUNT);
  });

  it("resolveBrandCategoryTiles > given a category > surfaces its highest cashback", () => {
    const tiles = resolveBrandCategoryTiles(CATALOG);

    expect(tiles[0].topCashback).toBe("9.8%");
    expect(tiles[1].topCashback).toBe("4.9%");
    expect(tiles[3].topCashback).toBe("8.4%");
  });

  it("resolveBrandCategoryTiles > given a category > links to its category stage", () => {
    const tiles = resolveBrandCategoryTiles(CATALOG);

    expect(tiles[0].href).toBe("/category/Travel");
    expect(tiles[1].href).toBe("/category/Health%20%26%20Beauty");
  });

  it("resolveBrandCategoryTiles > given fewer brands than slots > pads with blanks instead of stretching", () => {
    // Fashion has two brands in this catalogue. The card must still be a
    // three-cell grid, with the third left blank — one logo stretched across the
    // whole row is not the approved design.
    const fashion = resolveBrandCategoryTiles(CATALOG)[2];

    expect(fashion.logos).toHaveLength(BRAND_CATEGORY_TILE_LOGO_COUNT);
    expect(fashion.logos.filter(Boolean)).toHaveLength(2);
    expect(fashion.logos[2]).toBeNull();
  });

  it("resolveBrandCategoryTiles > given every category > always renders the same slot count", () => {
    for (const tile of resolveBrandCategoryTiles(CATALOG)) {
      expect(tile.logos).toHaveLength(BRAND_CATEGORY_TILE_LOGO_COUNT);
    }
  });

  it("resolveBrandCategoryTiles > given a category with no brands > drops the tile", () => {
    const travelOnly = CATALOG.filter((entry) => entry.category === "Travel");

    expect(resolveBrandCategoryTiles(travelOnly).map((tile) => tile.label)).toEqual(["Travel"]);
  });

  it("resolveBrandCategoryTiles > given an empty catalogue > renders nothing", () => {
    expect(resolveBrandCategoryTiles([])).toEqual([]);
  });
});
