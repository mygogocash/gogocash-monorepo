import { describe, expect, it } from "vitest";
import { isMerchantOfferResponse } from "../api/merchantTypes";
import { mapMerchantOfferToShopDetail } from "../api/merchantMapper";

const fixtureShop = {
  id: "brand-grocery-galaxy-1001",
  brand: "Grocery Galaxy",
  bannerAsset: "home-side-watch",
  category: "others",
  cashback: "26.5%",
  extraCashback: "14%",
  logoText: "GO",
  productRates: [{ name: "Groceries", rate: "0%" }],
  note: "fixture merchant campaign note",
  shopNowLabel: "Shop Now",
  disclaimer: "static legal copy",
} as const;

// Shape verified against the live staging detail response (2026-06-12):
// no offer_name_display / commission_store on detail docs; cashback lives in
// commissions[0].Commission as a preformatted string.
const liveOffer = {
  _id: "68345f00aa11bb22cc33dd44",
  categories: "Fashion",
  commissions: [{ Commission: "5.6%" }],
  logo: "https://cdn.example/logo.png",
  banner: "backend-banner-file-id",
  merchant_id: 2048,
  offer_id: 1024,
  offer_name: "Lazada TH",
  source: "involve",
  status: "active",
  tracking_link: "https://tracking.example/lazada",
};

describe("isMerchantOfferResponse", () => {
  it("given a live offer doc > then narrows", () => {
    expect(isMerchantOfferResponse(liveOffer)).toBe(true);
  });

  it("given the fixture shop, arrays, or null > then rejects", () => {
    expect(isMerchantOfferResponse(fixtureShop)).toBe(false);
    expect(isMerchantOfferResponse([liveOffer])).toBe(false);
    expect(isMerchantOfferResponse(null)).toBe(false);
  });
});

describe("mapMerchantOfferToShopDetail", () => {
  it("given a live offer > then overlays identity and media without leaking fixture merchant copy", () => {
    const shop = mapMerchantOfferToShopDetail(liveOffer, fixtureShop);

    expect(shop.id).toBe("68345f00aa11bb22cc33dd44");
    expect(shop.brand).toBe("Lazada TH");
    expect(shop.category).toBe("Fashion");
    expect(shop.cashback).toBe("5.6%");
    expect(shop.trackingUrl).toBe("https://tracking.example/lazada");
    expect(shop.logoUri).toBe("https://cdn.example/logo.png");
    expect(shop.bannerUri).toBe(
      "https://drive.google.com/uc?export=view&id=backend-banner-file-id"
    );
    expect(shop.logoText).toBe("LT");
    expect(shop.extraCashback).toBe("5.6%");
    expect(shop.productRates).toEqual([{ name: "Lazada TH", rate: "5.6%" }]);
    expect(shop.note).toContain("Lazada TH");
    expect(shop.disclaimer).toContain("Lazada TH");
    expect(shop.disclaimer).not.toBe("static legal copy");
    expect(shop.shopNowLabel).toBe("Shop Now");
  });

  it("given missing commission info > then the fixture cashback stands", () => {
    const shop = mapMerchantOfferToShopDetail({ ...liveOffer, commissions: [] }, fixtureShop);

    expect(shop.cashback).toBe("26.5%");
  });

  it("given a numeric commission without a percent sign > then formats it", () => {
    const shop = mapMerchantOfferToShopDetail(
      { ...liveOffer, commissions: [{ Commission: "7.25" }] },
      fixtureShop
    );

    expect(shop.cashback).toBe("7.25%");
  });
});
