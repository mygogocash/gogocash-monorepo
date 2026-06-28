import {
  findGoGoTrackMerchant,
  mapGoGoTrackMerchants,
} from "@mobile/gototrack/useGoGoTrackMerchants";
import { describe, expect, it } from "vitest";

describe("GoGoTrack merchant catalog", () => {
  it("maps backend merchant rows into app-facing catalog entries", () => {
    const merchants = mapGoGoTrackMerchants([
      {
        affiliate_network: "involve",
        android_packages: ["com.shopee.th"],
        domains: ["shopee.co.th"],
        enabled: true,
        merchant_id: "shopee",
        merchant_name: "Shopee",
        network_merchant_id: "101",
        offer_id: 202,
      },
    ]);

    expect(merchants).toEqual([
      {
        affiliateNetwork: "involve",
        androidPackages: ["com.shopee.th"],
        domains: ["shopee.co.th"],
        enabled: true,
        id: "shopee",
        name: "Shopee",
        networkMerchantId: 101,
        offerId: 202,
      },
    ]);
  });

  it("finds merchants by backend id or display-name slug", () => {
    const merchants = mapGoGoTrackMerchants({
      merchants: [
        {
          androidPackages: ["com.grocery.galaxy"],
          enabled: true,
          merchantId: "merchant-grocery-galaxy",
          merchantName: "Grocery Galaxy",
        },
      ],
    });

    expect(findGoGoTrackMerchant(merchants, "merchant-grocery-galaxy")?.name).toBe(
      "Grocery Galaxy",
    );
    expect(findGoGoTrackMerchant(merchants, "grocery-galaxy")?.id).toBe(
      "merchant-grocery-galaxy",
    );
  });
});
