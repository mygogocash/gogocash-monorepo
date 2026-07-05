import { describe, expect, it } from "vitest";

import {
  mapBackendTopBrands,
  mapOfferCatalogToTopBrands,
  resolveTopBrands,
  type TopBrandCard,
  type TopBrandsPayload,
} from "@mobile/account/topBrandResource";

const FIXTURE: readonly TopBrandCard[] = [
  {
    brand: "Fixture Co",
    cashback: "9.9%",
    label: "Grab Coupon",
    logoUri: "https://cdn/fix.png",
    showGrabCoupon: true,
    tint: "#000000",
  },
];

describe("mapBackendTopBrands", () => {
  it("given a null payload > then returns an empty list", () => {
    expect(mapBackendTopBrands(null)).toEqual([]);
  });

  it("given admin logo_desktop without resolved logo field > then maps logoUri from desktop upload", () => {
    const payload: TopBrandsPayload = {
      data: [
        {
          _id: "shopee-id",
          offer_id: 1783231275824,
          brand: "Shopee",
          logo_desktop: "https://media-staging.gogocash.co/brands/1783241514085-logo.png",
          cashback: "10%",
        },
      ],
    };

    expect(mapBackendTopBrands(payload)).toEqual([
      expect.objectContaining({
        brand: "Shopee",
        logoUri: "https://media-staging.gogocash.co/brands/1783241514085-logo.png",
      }),
    ]);
  });

  it("given Up to cashback label > then compacts for card layout", () => {
    expect(
      mapBackendTopBrands({
        data: [
          {
            _id: "lazada-id",
            offer_id: 1,
            brand: "Lazada",
            logo: "https://cdn/lazada.png",
            cashback: "Up to 2.02%",
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        brand: "Lazada",
        cashback: "2.02%",
      }),
    ]);
  });

  it("given backend brands > then maps name/logo/cashback and fills cosmetic fields", () => {
    const payload: TopBrandsPayload = {
      data: [
        { _id: "id-b", offer_id: 2, brand: "Bravo", logo: "https://cdn/b.png", cashback: "10.0%" },
        { _id: "id-a", offer_id: 1, brand: "Alpha", logo: "https://cdn/a.png", cashback: "12.5%" },
      ],
    };

    expect(mapBackendTopBrands(payload)).toEqual([
      {
        brand: "Bravo",
        cashback: "10.0%",
        href: "/shop/id-b",
        id: "id-b",
        label: "Grab Coupon",
        logoUri: "https://cdn/b.png",
        showGrabCoupon: false,
        tint: "#6366F1",
      },
      {
        brand: "Alpha",
        cashback: "12.5%",
        href: "/shop/id-a",
        id: "id-a",
        label: "Grab Coupon",
        logoUri: "https://cdn/a.png",
        showGrabCoupon: false,
        tint: "#2563EB",
      },
    ]);
  });

  it("given Taiwan region > then filters backend brands by countries metadata", () => {
    const payload: TopBrandsPayload = {
      data: [
        { _id: "th", offer_id: 1, brand: "Shopee TH", cashback: "10%", countries: "TH" },
        { _id: "tw", offer_id: 2, brand: "Shopee TW", cashback: "10%", countries: "TW" },
      ],
    };

    expect(mapBackendTopBrands(payload, "TW").map((brand) => brand.brand)).toEqual(["Shopee TW"]);
  });

  it("given stale hidden or unapproved backend brands > then drops them from customer cards", () => {
    const payload: TopBrandsPayload = {
      data: [
        { _id: "id-a", offer_id: 1, brand: "Alpha", logo: "https://cdn/a.png", cashback: "12.5%" },
        {
          _id: "hidden",
          offer_id: 2,
          brand: "Hidden",
          logo: "https://cdn/hidden.png",
          cashback: "9%",
          disabled: true,
          status: "approved",
        },
        {
          _id: "pending",
          offer_id: 3,
          brand: "Pending",
          logo: "https://cdn/pending.png",
          cashback: "8%",
          disabled: false,
          status: "pending",
        },
        {
          _id: "rejected",
          offer_id: 4,
          brand: "Rejected",
          logo: "https://cdn/rejected.png",
          cashback: "7%",
          disabled: false,
          status: "rejected",
        },
      ],
    };

    expect(mapBackendTopBrands(payload).map((brand) => brand.brand)).toEqual(["Alpha"]);
  });

  it("given two offers sharing a brand name > then assigns distinct stable ids (no duplicate React keys)", () => {
    const payload: TopBrandsPayload = {
      data: [
        { _id: "id-1", offer_id: 1, brand: "DupBrand", logo: "https://cdn/1.png", cashback: "5.0%" },
        { _id: "id-2", offer_id: 2, brand: "DupBrand", logo: "https://cdn/2.png", cashback: "6.0%" },
      ],
    };

    const cards = mapBackendTopBrands(payload);

    expect(cards.map((card) => card.id)).toEqual(["id-1", "id-2"]);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
  });

  it("given an offer with no _id > then falls back to the numeric offer_id for a stable id", () => {
    const payload: TopBrandsPayload = {
      data: [{ offer_id: 42, brand: "NoUnderscoreId", logo: "https://cdn/x.png", cashback: "3.0%" }],
    };

    expect(mapBackendTopBrands(payload)[0]?.id).toBe("42");
  });
});

describe("resolveTopBrands", () => {
  it("given fixtures source > then returns the fallback", () => {
    expect(resolveTopBrands("fixtures", null, FIXTURE)).toEqual(FIXTURE);
  });

  it("given fixtures source and Taiwan region > then filters tagged fixture brands", () => {
    const cards: TopBrandCard[] = [
      { ...FIXTURE[0], brand: "Grocery Galaxy" },
      { ...FIXTURE[0], brand: "PixelPort" },
    ];

    expect(resolveTopBrands("fixtures", null, cards, undefined, "TW").map((card) => card.brand)).toEqual([
      "PixelPort",
    ]);
  });

  it("given backend source with brands > then returns the mapped list", () => {
    const payload: TopBrandsPayload = {
      data: [{ _id: "id-a", offer_id: 1, brand: "Alpha", logo: "https://cdn/a.png", cashback: "12.5%" }],
    };

    expect(resolveTopBrands("backend", payload, FIXTURE)).toEqual([
      {
        brand: "Alpha",
        cashback: "12.5%",
        href: "/shop/id-a",
        id: "id-a",
        label: "Grab Coupon",
        logoUri: "https://cdn/a.png",
        showGrabCoupon: false,
        tint: "#6366F1",
      },
    ]);
  });

  it("given backend source with an empty payload > then returns empty because admin config is authoritative", () => {
    expect(resolveTopBrands("backend", { data: [] }, FIXTURE)).toEqual([]);
  });

  it("given backend source with empty curated brands and a live catalog > then keeps the empty curated state", () => {
    const catalogPayload = {
      data: [
        {
          _id: "offer-live",
          commission_store: 8.5,
          extra_store: true,
          logo: "https://cdn/live.png",
          offer_name: "Live Offer - CPS",
          offer_name_display: "Live Brand",
          status: "approved",
        },
      ],
      limit: 80,
      page: 1,
      total: 1,
      totalPages: 1,
    };

    expect(resolveTopBrands("backend", { data: [] }, FIXTURE, catalogPayload)).toEqual([]);
  });

  it("given backend source with null data > then returns empty instead of fixtures", () => {
    expect(resolveTopBrands("backend", null, FIXTURE)).toEqual([]);
  });
});

describe("mapOfferCatalogToTopBrands", () => {
  it("given a live offer catalog > then maps visible offers to home top-brand cards", () => {
    expect(
      mapOfferCatalogToTopBrands({
        data: [
          {
            _id: "offer-alpha",
            commission_store: "12.5",
            extra_store: false,
            logo: "https://cdn/alpha.png",
            offer_name: "Alpha Raw",
            offer_name_display: "Alpha",
            status: "approved",
          },
        ],
        limit: 80,
        page: 1,
        total: 1,
        totalPages: 1,
      }),
    ).toEqual([
      {
        brand: "Alpha",
        cashback: "12.5%",
        href: "/shop/offer-alpha",
        id: "/shop/offer-alpha",
        label: "Grab Coupon",
        logoUri: "https://cdn/alpha.png",
        showGrabCoupon: false,
        tint: expect.any(String),
      },
    ]);
  });
});
