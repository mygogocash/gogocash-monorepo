import { describe, expect, it, vi } from "vitest";
import { isMerchantOfferResponse } from "../api/merchantTypes";
import {
  buildTrackingPeriodSteps,
  mapMerchantOfferToShopDetail,
  resolveActiveShopCashback,
} from "../api/merchantMapper";

vi.mock("@mobile/config/env", () => ({
  getMobileEnv: () => ({
    apiUrl: "https://api-staging.gogocash.co",
  }),
}));

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
  trackingUrl: "https://fixture.example/must-not-leak",
  disclaimer: "static legal copy",
  trackingPeriod: [
    { label: "Purchase", detail: "with GoGoCash", icon: "shopping" },
    { label: "Tracking", detail: "within 30 day", icon: "check" },
    { label: "Confirm", detail: "within 30 day", icon: "bank" },
  ],
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
  custom_terms: "1. Custom merchant term\n2. No stacking",
  note_to_user: "Flash sale this week only.",
  policy_category_id: "68345f00aa11bb22cc33dd99",
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
  it("given staging media banner and logo > then both route through the image transform at their widths", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        banner: "https://media-staging.gogocash.co/brands/shop-banner.png",
        logo: "https://media-staging.gogocash.co/brands/shop-logo.png",
      },
      fixtureShop,
    );

    expect(shop.bannerUri).toBe(
      "https://media-staging.gogocash.co/cdn-cgi/image/width=1080,quality=78,fit=scale-down,format=auto,onerror=redirect/brands/shop-banner.png",
    );
    expect(shop.logoUri).toBe(
      "https://media-staging.gogocash.co/cdn-cgi/image/width=320,quality=78,fit=scale-down,format=auto,onerror=redirect/brands/shop-logo.png",
    );
  });

  it("given a live offer > then overlays identity and media without leaking fixture merchant copy", () => {
    const shop = mapMerchantOfferToShopDetail(liveOffer, fixtureShop);

    expect(shop.id).toBe("68345f00aa11bb22cc33dd44");
    expect(shop.brand).toBe("Lazada TH");
    expect(shop.category).toBe("Fashion");
    expect(shop.cashback).toBe("5.6%");
    expect(shop.trackingUrl).toBe("https://tracking.example/lazada");
    // Network ids ride through so Shop Now can mint a per-user tracked link.
    expect(shop.offerId).toBe(1024);
    expect(shop.merchantId).toBe(2048);
    expect(shop.logoUri).toBe("https://cdn.example/logo.png");
    expect(shop.bannerUri).toBe(
      "https://drive.google.com/uc?export=view&id=backend-banner-file-id"
    );
    expect(shop.logoText).toBe("LT");
    expect(shop.extraCashback).toBe("5.6%");
    expect(shop.productRates).toEqual([{ name: "Lazada TH", rate: "5.6%" }]);
    expect(shop.note).toBe("Flash sale this week only.");
    expect(shop.noteToUser).toBe("Flash sale this week only.");
    expect(shop.customTerms).toBe("1. Custom merchant term\n2. No stacking");
    expect(shop.policyCategoryId).toBe("68345f00aa11bb22cc33dd99");
    // Brand-less constant so tc() can reverse-look-up the catalog value in Thai mode.
    expect(shop.disclaimer).toBe(
      "Cashback rates, tracking windows, exclusions, and availability can change. " +
        "Final approval remains subject to the merchant and partner network.",
    );
    expect(shop.disclaimer).not.toBe("static legal copy");
    expect(shop.shopNowLabel).toBe("Shop Now");
  });

  it("given a live offer without tracking_link > never inherits a fixture destination", () => {
    const shop = mapMerchantOfferToShopDetail(
      { ...liveOffer, tracking_link: undefined },
      fixtureShop,
    );

    expect(shop.trackingUrl).toBeUndefined();
  });

  it("#310 > given the custom-writing sentinel > then no category policy endpoint is requested", () => {
    const shop = mapMerchantOfferToShopDetail(
      { ...liveOffer, policy_category_id: "custom" },
      fixtureShop,
    );

    expect(shop.customTerms).toBe("1. Custom merchant term\n2. No stacking");
    expect(shop.policyCategoryId).toBeUndefined();
  });

  it("#316 > given an enabled admin brand-category override > then customer detail uses it instead of the partner feed category", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        categories: "Shopping",
        offer_display_tags: {
          brand_category_enabled: true,
          brand_category_label: "Digital Services",
        },
      },
      fixtureShop,
    );

    expect(shop.category).toBe("Digital Services");
  });

  it("#316 > given a disabled or blank admin category override > then customer detail keeps the partner feed category", () => {
    const disabled = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        categories: "Shopping",
        offer_display_tags: {
          brand_category_enabled: false,
          brand_category_label: "Digital Services",
        },
      },
      fixtureShop,
    );
    const blank = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        categories: "Shopping",
        offer_display_tags: {
          brand_category_enabled: true,
          brand_category_label: "  ",
        },
      },
      fixtureShop,
    );

    expect(disabled.category).toBe("Shopping");
    expect(blank.category).toBe("Shopping");
  });

  it("given tracking_period with tracking 7 and confirm 15 > then steps read within N day with fixture labels and icons", () => {
    const shop = mapMerchantOfferToShopDetail(
      { ...liveOffer, tracking_period: { tracking_days: 7, confirm_days: 15 } },
      fixtureShop,
    );

    expect(shop.trackingPeriod).toEqual([
      { label: "Purchase", detail: "with GoGoCash", icon: "shopping" },
      { label: "Tracking", detail: "within 7 day", icon: "check" },
      { label: "Confirm", detail: "within 15 day", icon: "bank" },
    ]);
  });

  it("given no tracking_period field (older API) > then fixture steps pass through unchanged", () => {
    const shop = mapMerchantOfferToShopDetail(liveOffer, fixtureShop);

    expect(shop.trackingPeriod).toEqual(fixtureShop.trackingPeriod);
  });

  it("given a three_step tracking_period with subtitles > then Tracking and Confirm carry them", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        tracking_period: {
          tracking_days: 7,
          confirm_days: 15,
          flow_type: "three_step",
          tracking_subtitle: "from the following month",
          confirm_subtitle: "after validation",
        },
      },
      fixtureShop,
    );

    expect(shop.trackingPeriod).toEqual([
      { label: "Purchase", detail: "with GoGoCash", icon: "shopping" },
      {
        label: "Tracking",
        detail: "within 7 day",
        icon: "check",
        subtitle: "from the following month",
      },
      {
        label: "Confirm",
        detail: "within 15 day",
        icon: "bank",
        subtitle: "after validation",
      },
    ]);
  });

  it("given a two_step tracking_period > then the strip collapses to Purchase + a combined Tracking and confirm step", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        tracking_period: {
          tracking_days: 7,
          confirm_days: 45,
          flow_type: "two_step",
          tracking_subtitle: "from the following month",
          confirm_subtitle: "once the store approves",
        },
      },
      fixtureShop,
    );

    expect(shop.trackingPeriod).toEqual([
      { label: "Purchase", detail: "with GoGoCash", icon: "shopping" },
      {
        label: "Tracking and confirm",
        detail: "within 45 day",
        icon: "bank",
        subtitle: "once the store approves",
      },
    ]);
  });

  it("given a tracking_period without flow_type (older API) > then it renders as three_step without subtitle lines", () => {
    const shop = mapMerchantOfferToShopDetail(
      { ...liveOffer, tracking_period: { tracking_days: 7, confirm_days: 15 } },
      fixtureShop,
    );

    expect(shop.trackingPeriod).toHaveLength(3);
    expect(
      shop.trackingPeriod.every((step) => step.subtitle === undefined),
    ).toBe(true);
  });

  it("buildTrackingPeriodSteps > given zero, negative, or non-integer days > then it returns null", () => {
    expect(buildTrackingPeriodSteps(undefined)).toBeNull();
    expect(buildTrackingPeriodSteps({ tracking_days: 0, confirm_days: 30 })).toBeNull();
    expect(buildTrackingPeriodSteps({ tracking_days: 30, confirm_days: -1 })).toBeNull();
    expect(buildTrackingPeriodSteps({ tracking_days: 2.5, confirm_days: 30 })).toBeNull();
    expect(buildTrackingPeriodSteps({ tracking_days: 30 })).toBeNull();
  });

  it("given missing commission info > then does not leak fixture cashback onto the live merchant", () => {
    const shop = mapMerchantOfferToShopDetail({ ...liveOffer, commissions: [] }, fixtureShop);

    expect(shop.cashback).toBe("—");
    expect(shop.extraCashback).toBe("—");
    expect(shop.productRates).toEqual([{ name: "Lazada TH", rate: "—" }]);
    expect(shop.cashback).not.toBe(fixtureShop.cashback);
  });

  // #428 — product-type rows present but headline commission fields empty.
  it("given product_type rates without commission_store > then uses the highest product rate", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        commissions: [],
        product_type: [
          { name: "Fashion", pay_in: "cashback", commission_info: "2.5" },
          { name: "Beauty", pay_in: "cashback", commission_info: "6" },
        ],
      },
      fixtureShop,
    );

    expect(shop.cashback).toBe("6%");
    expect(shop.extraCashback).toBe("6%");
    // #465 — list rows, not a single synthetic headline.
    expect(shop.productRates).toEqual([
      { name: "Fashion", rate: "2.5%" },
      { name: "Beauty", rate: "6%" },
    ]);
  });

  it("given extra_cashback_tag off > then showExtraCashbackTag is false (#472)", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        offer_display_tags: {
          brand_category_enabled: true,
          brand_category_label: "Electronics",
          extra_cashback_tag: false,
        },
      },
      fixtureShop,
    );

    expect(shop.showExtraCashbackTag).toBe(false);
  });

  it("given commission_store 0 with product_type rates > then uses the highest product rate", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        commission_store: 0,
        commissions: [],
        product_type: [
          { name: "Beauty", pay_in: "cashback", commission_info: "8" },
        ],
      },
      fixtureShop,
    );

    expect(shop.cashback).toBe("8%");
  });

  it("given a numeric commission without a percent sign > then formats it", () => {
    const shop = mapMerchantOfferToShopDetail(
      { ...liveOffer, commissions: [{ Commission: "7.25" }] },
      fixtureShop
    );

    expect(shop.cashback).toBe("7.25%");
  });

  it("given logo_desktop and legacy logo > then prefers admin desktop logo", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        logo: "https://cdn.example/legacy.png",
        logo_desktop: "https://cdn.example/desktop.png",
      },
      fixtureShop
    );

    expect(shop.logoUri).toBe("https://cdn.example/desktop.png");
  });

  it("given offer_name_display from staging Shopee detail > then prefers display name over offer_name", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        _id: "6a49f3e6ce2e0da81d6dc375",
        offer_name: "Shopee Affiliate Program",
        offer_name_display: "Shopee",
        commissions: [{ Commission: "2.02%" }],
      },
      fixtureShop
    );

    expect(shop.brand).toBe("Shopee");
    expect(shop.cashback).toBe("2.02%");
  });

  it("given missing offer_name but display name present > then still maps brand", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        offer_name: "",
        offer_name_display: "Shopee",
      },
      fixtureShop
    );

    expect(shop.brand).toBe("Shopee");
  });

  it("given no banner but logo_circle brand cover > then uses cover on shop hero", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        banner: undefined,
        logo_circle: "https://cdn.example/cover.png",
      },
      fixtureShop
    );

    expect(shop.bannerUri).toBe("https://cdn.example/cover.png");
  });

  it("#471 > given active upsize product lines > then shop detail uses upsize rates", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        commission_store: 2.8,
        commissions: [{ Commission: "2.8%" }],
        product_type: [
          { name: "Phones", pay_in: "cashback", commission_info: "2.8" },
        ],
        upsize_all_product_types: false,
        upsize_start_date: "2020-01-01",
        upsize_end_date: "2099-12-31",
        upsize_product_types: [
          {
            name: "OPPO Find X9",
            pay_in: "cashback",
            commission_info: "3.5",
          },
        ],
      },
      fixtureShop,
    );

    expect(shop.cashback).toBe("3.5%");
    expect(shop.extraCashback).toBe("3.5%");
    expect(shop.productRates).toEqual([{ name: "OPPO Find X9", rate: "3.5%" }]);
  });

  it("#471 > given expired upsize > then shop detail keeps base cashback", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        commission_store: 2.8,
        commissions: [{ Commission: "2.8%" }],
        product_type: [
          { name: "Phones", pay_in: "cashback", commission_info: "2.8" },
        ],
        upsize_all_product_types: false,
        upsize_start_date: "2020-01-01",
        upsize_end_date: "2020-12-31",
        upsize_product_types: [
          {
            name: "OPPO Find X9",
            pay_in: "cashback",
            commission_info: "3.5",
          },
        ],
      },
      fixtureShop,
    );

    expect(shop.cashback).toBe("2.8%");
    expect(shop.productRates).toEqual([{ name: "Phones", rate: "2.8%" }]);
  });

  it("#471 > given active all-product upsize commission > then headline uses special commission", () => {
    const resolved = resolveActiveShopCashback(
      {
        ...liveOffer,
        commission_store: 2.8,
        upsize_all_product_types: true,
        upsize_special_commission: 4.2,
        upsize_start_date: "2020-01-01",
      },
      Date.parse("2026-07-15T12:00:00"),
    );
    expect(resolved.commission_store).toBe(4.2);
    expect(resolved.product_type).toBeUndefined();
  });

  it("#465 > given all_product_types true > then shop detail uses a single headline rate row", () => {
    const shop = mapMerchantOfferToShopDetail(
      {
        ...liveOffer,
        all_product_types: true,
        commission_store: 2.8,
        product_type: [
          { name: "Phones", pay_in: "cashback", commission_info: "2.8" },
          { name: "Accessories", pay_in: "cashback", commission_info: "1.4" },
        ],
      },
      fixtureShop,
    );

    expect(shop.productRates).toEqual([{ name: "Lazada TH", rate: "2.8%" }]);
  });
});
