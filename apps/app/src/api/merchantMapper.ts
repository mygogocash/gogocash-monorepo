import type { MerchantOfferResponse } from "@mobile/api/merchantTypes";
import { resolveOfferMediaUrl } from "@mobile/api/mediaUrl";
import { getMobileEnv } from "@mobile/config/env";
import {
  resolvePublicOfferLogo,
  resolveShopPageBannerUri,
} from "@mobile/api/offerLogo";

type ShopDetailIdentity = {
  brand: string;
  cashback: string;
  category: string;
  customTerms?: string;
  id: string;
  policyCategoryId?: string;
  trackingUrl?: string;
};

type ProductRate = {
  name: string;
  rate: string;
};

type LiveShopDetailFields = {
  bannerUri?: string;
  customTerms?: string;
  disclaimer: string;
  extraCashback: string;
  logoText: string;
  logoUri?: string;
  note: string;
  noteToUser?: string;
  policyCategoryId?: string;
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

function firstImageUri(apiBaseUrl: string, ...values: unknown[]): string | undefined {
  for (const value of values) {
    const uri = resolveOfferMediaUrl(value, apiBaseUrl);
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
  const brand =
    offer.offer_name_display?.trim() || offer.offer_name?.trim() || fixtureShop.brand;
  // Never fall back to fixture cashback on a live offer — that leaks Grocery Galaxy
  // rates (e.g. 26.5%) onto merchants whose commission fields are empty.
  const cashback = formatCashback(offer) ?? "—";
  const apiBaseUrl = getMobileEnv().apiUrl;

  return {
    ...fixtureShop,
    bannerUri: firstImageUri(apiBaseUrl, resolveShopPageBannerUri(offer)),
    brand,
    cashback,
    category: offer.categories?.trim() || fixtureShop.category,
    customTerms: offer.custom_terms?.trim() || undefined,
    disclaimer:
      `${brand} cashback rates, tracking windows, exclusions, and availability can change. ` +
      "Final approval remains subject to the merchant and partner network.",
    extraCashback: cashback,
    id: offer._id,
    logoText: initialsFromBrand(brand),
    logoUri: firstImageUri(apiBaseUrl, resolvePublicOfferLogo(offer)),
    note:
      offer.note_to_user?.trim() ||
      `${brand} cashback is tracked through GoGoCash after you open the merchant link and complete an eligible order.`,
    noteToUser: offer.note_to_user?.trim() || undefined,
    policyCategoryId: offer.policy_category_id?.trim() || undefined,
    productRates: [{ name: brand, rate: cashback }],
    trackingUrl: offer.tracking_link?.trim() || fixtureShop.trackingUrl,
  };
}
