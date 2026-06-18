import type { MerchantOfferResponse } from "@mobile/api/merchantTypes";
import { resolveRemoteImageUri } from "@mobile/api/mediaUrl";

type ShopDetailIdentity = {
  brand: string;
  cashback: string;
  category: string;
  id: string;
  trackingUrl?: string;
};

type ProductRate = {
  name: string;
  rate: string;
};

type LiveShopDetailFields = {
  bannerUri?: string;
  disclaimer: string;
  extraCashback: string;
  logoText: string;
  logoUri?: string;
  note: string;
  productRates: ProductRate[];
};

function formatCashback(offer: MerchantOfferResponse): string | null {
  const store = offer.commission_store;
  if (typeof store === "number" && Number.isFinite(store)) {
    return `${store}%`;
  }
  if (typeof store === "string" && store.trim()) {
    return store.includes("%") ? store.trim() : `${store.trim()}%`;
  }
  const commission = offer.commissions?.[0]?.Commission?.trim();
  if (commission) {
    return commission.includes("%") ? commission : `${commission}%`;
  }
  return null;
}

function initialsFromBrand(brand: string): string {
  const parts = brand
    .replace(/&/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "GO";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function firstImageUri(...values: unknown[]): string | undefined {
  for (const value of values) {
    const uri = resolveRemoteImageUri(value);
    if (uri) {
      return uri;
    }
  }
  return undefined;
}

export function mapMerchantOfferToShopDetail<TShop extends ShopDetailIdentity>(
  offer: MerchantOfferResponse,
  fixtureShop: TShop
): Omit<TShop, keyof ShopDetailIdentity> & ShopDetailIdentity & LiveShopDetailFields {
  const brand = offer.offer_name_display?.trim() || offer.offer_name.trim() || fixtureShop.brand;
  const cashback = formatCashback(offer) ?? fixtureShop.cashback;

  return {
    ...fixtureShop,
    bannerUri: firstImageUri(offer.banner),
    brand,
    cashback,
    category: offer.categories?.trim() || fixtureShop.category,
    disclaimer:
      `${brand} cashback rates, tracking windows, exclusions, and availability can change. ` +
      "Final approval remains subject to the merchant and partner network.",
    extraCashback: cashback,
    id: offer._id,
    logoText: initialsFromBrand(brand),
    logoUri: firstImageUri(offer.logo_circle, offer.logo, offer.logo_desktop, offer.logo_mobile),
    note: `${brand} cashback is tracked through GoGoCash after you open the merchant link and complete an eligible order.`,
    productRates: [{ name: brand, rate: cashback }],
    trackingUrl: offer.tracking_link?.trim() || fixtureShop.trackingUrl,
  };
}
