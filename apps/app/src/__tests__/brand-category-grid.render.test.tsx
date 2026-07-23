import { describe, expect, it } from "vitest";

import {
  chunkBrandCategoryRows,
  getBrandCategoryColumns,
} from "@mobile/screens/home/BrandCategorySection";

/**
 * Founder spec: 4-up on one desktop row, 2x2 on mobile.
 *
 * Cards used to carry a computed pixel width, which was derived from a width that
 * was not the row they landed in — at 390px the row was 342 but the cards were
 * sized for 358, so they wrapped one per row. Explicit rows plus `flex: 1` remove
 * the arithmetic entirely.
 */
describe("brand category grid rows", () => {
  it("desktop > given four categories > lays them out as a single row of four", () => {
    expect(chunkBrandCategoryRows(["a", "b", "c", "d"], getBrandCategoryColumns(true))).toEqual([
      ["a", "b", "c", "d"],
    ]);
  });

  it("mobile > given four categories > lays them out 2x2", () => {
    expect(chunkBrandCategoryRows(["a", "b", "c", "d"], getBrandCategoryColumns(false))).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("mobile > given an odd count > leaves the last row short for spacers to pad", () => {
    expect(chunkBrandCategoryRows(["a", "b", "c"], 2)).toEqual([["a", "b"], ["c"]]);
  });
});
