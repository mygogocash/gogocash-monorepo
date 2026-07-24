import { describe, expect, it } from "vitest";

import {
  DESKTOP_CONTENT_FRAME,
  MOBILE_STATIC_GRID_MAX_CARDS,
  TABLET_CONTENT_FRAME,
  desktopColumnsPerRow,
  desktopPreviewPages,
  desktopPreviewRows,
  isMobileStaticGrid,
  mobilePreviewColumns,
} from "./topBrandPreviewLayout";

/**
 * Pins the admin-side mirror of the customer top-brand layout contract.
 * The app pins the same numbers from its side (web-design-parity tests),
 * so a change to either implementation fails one of the pinned suites.
 */
describe("topBrandPreviewLayout", () => {
  const ids = (count: number) =>
    Array.from({ length: count }, (_, index) => `offer-${index + 1}`);

  it("desktopColumnsPerRow > given the 1200px desktop frame > then fits 6 cards per row", () => {
    expect(desktopColumnsPerRow(DESKTOP_CONTENT_FRAME)).toBe(6);
    expect(desktopColumnsPerRow()).toBe(6);
  });

  it("desktopColumnsPerRow > given the 900px tablet frame > then fits 4 cards per row", () => {
    expect(desktopColumnsPerRow(TABLET_CONTENT_FRAME)).toBe(4);
  });

  it("desktopPreviewPages > given 13 brands on desktop > then keeps the logical 12-item page order", () => {
    const pages = desktopPreviewPages(ids(13));

    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(12);
    expect(pages[1]).toEqual(["offer-13"]);
    expect(pages[0]).toEqual(ids(12));
  });

  it.each([10, 12])(
    "desktopPreviewRows > given %i brands > then projects odd positions above even positions without changing source indices",
    (count) => {
      const [topRow, bottomRow] = desktopPreviewRows(ids(count));

      expect(topRow.map(({ item }) => item)).toEqual(
        ids(count).filter((_, index) => index % 2 === 0),
      );
      expect(bottomRow.map(({ item }) => item)).toEqual(
        ids(count).filter((_, index) => index % 2 === 1),
      );
      expect(topRow.map(({ sourceIndex }) => sourceIndex)).toEqual(
        Array.from({ length: Math.ceil(count / 2) }, (_, index) => index * 2),
      );
      expect(bottomRow.map(({ sourceIndex }) => sourceIndex)).toEqual(
        Array.from(
          { length: Math.floor(count / 2) },
          (_, index) => index * 2 + 1,
        ),
      );
    },
  );

  it("desktopPreviewRows > given a partial second page > then source indices stay page-local", () => {
    expect(desktopPreviewRows(["offer-13", "offer-14", "offer-15"])).toEqual([
      [
        { item: "offer-13", sourceIndex: 0 },
        { item: "offer-15", sourceIndex: 2 },
      ],
      [{ item: "offer-14", sourceIndex: 1 }],
    ]);
  });

  it("mobilePreviewColumns > given 5 brands > then stacks consecutive pairs as vertical columns", () => {
    expect(mobilePreviewColumns(ids(5))).toEqual([
      ["offer-1", "offer-2"],
      ["offer-3", "offer-4"],
      ["offer-5"],
    ]);
  });

  it("isMobileStaticGrid > given the 4-card boundary > then switches modes at 5", () => {
    expect(isMobileStaticGrid(MOBILE_STATIC_GRID_MAX_CARDS)).toBe(true);
    expect(isMobileStaticGrid(MOBILE_STATIC_GRID_MAX_CARDS + 1)).toBe(false);
    expect(isMobileStaticGrid(0)).toBe(true);
  });
});
