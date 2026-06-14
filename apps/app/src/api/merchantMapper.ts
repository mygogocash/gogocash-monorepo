import type { MerchantOfferResponse } from "@mobile/api/merchantTypes";

// The shop-detail fixture is a large view-model where most copy (disclaimer,
// tracking timeline, referral promo, …) is static product content with no
// backend source. The live offer overlays only the merchant identity fields;
// everything else passes through from the fixture.
type ShopDetailIdentity = {
  brand: string;
  cashback: string;
  category: string;
  id: string;
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

export function mapMerchantOfferToShopDetail<TShop extends ShopDetailIdentity>(
  offer: MerchantOfferResponse,
  fixtureShop: TShop
): Omit<TShop, keyof ShopDetailIdentity> & ShopDetailIdentity {
  return {
    ...fixtureShop,
    brand: offer.offer_name_display?.trim() || offer.offer_name.trim() || fixtureShop.brand,
    cashback: formatCashback(offer) ?? fixtureShop.cashback,
    category: offer.categories?.trim() || fixtureShop.category,
    id: offer._id,
  };
}
