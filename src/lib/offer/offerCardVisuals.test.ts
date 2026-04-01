import { describe, expect, it } from "vitest";
import type { DataOffer } from "@/interfaces/offer";
import {
  getOfferBannerSrc,
  getOfferCashbackPercentLabel,
  getOfferCategoryRowVisual,
} from "./offerCardVisuals";

/** Minimal stub; tests only touch banner / commission fields. */
function stubOffer(partial: Partial<DataOffer>): DataOffer {
  return partial as DataOffer;
}

describe("getOfferBannerSrc", () => {
  it("returns fallback when no banners", () => {
    expect(getOfferBannerSrc(stubOffer({ banner: "", banner_mobile: "" }), true)).toBe(
      "/home/banner.webp"
    );
  });
});

describe("getOfferCashbackPercentLabel", () => {
  it("returns 0.0% when commissions array is empty (matches legacy CardSlide truthy check)", () => {
    expect(getOfferCashbackPercentLabel(stubOffer({ commissions: [] }))).toBe("0.0%");
  });

  it("uses commission_store when truthy", () => {
    expect(
      getOfferCashbackPercentLabel(stubOffer({ commission_store: 12.5, commissions: [] }))
    ).toBe("12.5%");
  });

  it("falls back to commissions when commission_store is falsy", () => {
    expect(
      getOfferCashbackPercentLabel(
        stubOffer({
          commission_store: 0,
          commissions: [{ cashback: "8.0%" }],
        })
      )
    ).toBe("8.0%");
  });
});

describe("getOfferCategoryRowVisual", () => {
  it("maps electronic to Electronics tap", () => {
    expect(getOfferCategoryRowVisual("electronic")).toEqual({
      label: "Electronics",
      iconIndex: 2,
    });
  });

  it("maps others to Others tap", () => {
    expect(getOfferCategoryRowVisual("others")).toEqual({
      label: "Others",
      iconIndex: 12,
    });
  });

  it("uses first comma-separated segment", () => {
    expect(getOfferCategoryRowVisual("Travel, Marketplace")).toEqual({
      label: "Travel",
      iconIndex: 10,
    });
  });

  it("falls back to Others label when categories empty", () => {
    expect(getOfferCategoryRowVisual("")).toEqual({
      label: "Others",
      iconIndex: 12,
    });
  });

  it("uses raw label with Others icon for unknown API names", () => {
    expect(getOfferCategoryRowVisual("Custom Vendor Category")).toEqual({
      label: "Custom Vendor Category",
      iconIndex: 12,
    });
  });
});
