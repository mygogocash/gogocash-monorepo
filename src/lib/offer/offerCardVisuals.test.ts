import { describe, expect, it } from "vitest";
import type { DataOffer } from "@/interfaces/offer";
import { getOfferBannerSrc, getOfferCashbackPercentLabel } from "./offerCardVisuals";

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
