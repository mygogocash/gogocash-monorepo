import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildGoLinkTrackingUrl, matchGoLinkOffer } from "@mobile/features/golinkResolve";
import { translateCopy } from "@mobile/i18n/messages";

const OFFERS = [
  {
    _id: "shopee-id",
    offer_id: 5031,
    merchant_id: 103877,
    offer_name: "Shopee Affiliate Program (TH)",
    offer_name_display: "Shopee",
    lookup_value: "shopee_th",
    tracking_link: "https://invl.me/aff_m?offer_id=103877&aff_id=23854&source=ia_api_offer",
    commission_store: 0.29,
  },
  {
    _id: "shopee-my-id",
    offer_id: 5099,
    merchant_id: 103999,
    offer_name: "Shopee Affiliate Program (MY) Extra Longer Name",
    offer_name_display: "Shopee Malaysia Campaign",
    lookup_value: "shopee_my",
    tracking_link: "https://invl.me/aff_m?offer_id=103999&aff_id=23854",
  },
  {
    _id: "lazada-id",
    offer_id: 4648,
    merchant_id: 104001,
    offer_name: "Lazada TH",
    offer_name_display: "Lazada",
    lookup_value: "lazada_th",
    tracking_link: "https://invl.me/aff_m?offer_id=104001&aff_id=23854",
  },
  {
    _id: "tiktok-id",
    offer_id: 7000,
    merchant_id: 105000,
    offer_name: "TikTok Shop TH",
    offer_name_display: "TikTok Shop",
    lookup_value: "tiktok_shop_th",
    tracking_link: "https://invl.me/aff_m?offer_id=105000&aff_id=23854",
  },
  {
    _id: "konvy-id",
    offer_id: 8000,
    merchant_id: 106000,
    offer_name: "Konvy",
    offer_name_display: "Konvy",
    lookup_value: "konvy_th",
    tracking_link: "https://invl.me/aff_m?offer_id=106000&aff_id=23854",
  },
  {
    _id: "hidden-id",
    offer_id: 9000,
    merchant_id: 107000,
    offer_name: "Shopee Hidden",
    offer_name_display: "Shopee Hidden",
    lookup_value: "shopee_hidden",
    tracking_link: "https://invl.me/aff_m?offer_id=107000",
    disabled: true,
  },
] as const;

describe("matchGoLinkOffer", () => {
  it("given a Shopee short link (th.shp.ee) > then matches the Shopee offer via the alias map", () => {
    expect(matchGoLinkOffer("https://th.shp.ee/z8iq8y9i?smtt=0.0.9", OFFERS)?._id).toBe(
      "shopee-id",
    );
  });

  it("given a Lazada short link (s.lazada.co.th) > then matches Lazada", () => {
    expect(matchGoLinkOffer("https://s.lazada.co.th/s.abc123", OFFERS)?._id).toBe("lazada-id");
  });

  it("given a TikTok share link (vt.tiktok.com) > then matches TikTok Shop", () => {
    expect(matchGoLinkOffer("https://vt.tiktok.com/ZS123abc/", OFFERS)?._id).toBe("tiktok-id");
  });

  it("given a merchant with no alias (konvy.com) > then falls back to the registrable label token", () => {
    expect(matchGoLinkOffer("https://www.konvy.com/la-glace/pads-160ml.html", OFFERS)?._id).toBe(
      "konvy-id",
    );
  });

  it("given multiple candidates > then prefers the shortest display name (most canonical)", () => {
    // shopee.co.th matches both TH ("Shopee") and MY ("Shopee Malaysia Campaign").
    expect(matchGoLinkOffer("https://shopee.co.th/product/1/2", OFFERS)?._id).toBe("shopee-id");
  });

  it("given disabled offers > then they never match", () => {
    const onlyHidden = OFFERS.filter((offer) => offer._id === "hidden-id");
    expect(matchGoLinkOffer("https://shopee.co.th/p/1", onlyHidden)).toBeNull();
  });

  it("given an unknown host > then returns null", () => {
    expect(matchGoLinkOffer("https://unknown-store.example.com/item/9", OFFERS)).toBeNull();
  });
});

describe("buildGoLinkTrackingUrl", () => {
  it("appends the pasted product URL with & when the link already has a query", () => {
    expect(
      buildGoLinkTrackingUrl(
        "https://invl.me/aff_m?offer_id=103877&aff_id=23854",
        "https://th.shp.ee/z8iq8y9i?smtt=0.0.9",
      ),
    ).toBe(
      "https://invl.me/aff_m?offer_id=103877&aff_id=23854&url=https%3A%2F%2Fth.shp.ee%2Fz8iq8y9i%3Fsmtt%3D0.0.9",
    );
  });

  it("appends with ? when the link has no query", () => {
    expect(buildGoLinkTrackingUrl("https://invl.me/aff_m", "https://a.b/c")).toBe(
      "https://invl.me/aff_m?url=https%3A%2F%2Fa.b%2Fc",
    );
  });

  it("returns an empty tracking link unchanged (caller decides the fallback)", () => {
    expect(buildGoLinkTrackingUrl("", "https://a.b/c")).toBe("");
  });
});

describe("GoGoLink live wiring (source signals)", () => {
  const screenSource = readFileSync(
    resolve(__dirname, "../screens/CustomerGoLinkScreen.tsx"),
    "utf8",
  );

  it("the screen resolves the pasted link against the live catalog and mints a per-user deeplink", () => {
    expect(screenSource).toContain("matchGoLinkOffer(");
    expect(screenSource).toContain("buildGoLinkTrackingUrl(");
    expect(screenSource).toContain("/involve/create-affiliate");
  });

  it("Shop Now auth-gates via the login redirect and only hard-routes fixtures mode to the demo shop", () => {
    expect(screenSource).toContain('buildLoginRedirectWithCallback("/golink")');
    // The fixture route survives only behind the !liveGoLink branch.
    expect(screenSource).toMatch(/if \(!liveGoLink\) \{\s*router\.push\(goLinkShopNowRoute\)/);
  });

  it("the new dialog copy translates to Thai", () => {
    const untranslated = [
      "Checking store…",
      "This store isn't supported by GoGoLink yet.",
      "Cashback rate shown is the store's current maximum. Final approval depends on the store and offer terms.",
    ].filter((s) => translateCopy(s, "th") === s);
    expect(untranslated).toEqual([]);
  });
});
