export const shopCashbackTipIds = [
  "excluded-products",
  "check-terms",
  "restart-platform",
  "no-adblock",
  "empty-cart",
  "payment-fail",
  "accept-cookies",
] as const;

export type ShopCashbackTipId = (typeof shopCashbackTipIds)[number];

export type ShopCashbackTipHighlight = {
  readonly id: ShopCashbackTipId;
  readonly kind: "highlight";
  readonly badgeKey: "excludedProductsLabel";
  readonly leadKey: "excludedProductsTipLead";
  readonly emphasisKey: "excludedProductsTipEmphasis";
  readonly showLiveVideoLabels: true;
};

export type ShopCashbackTipText = {
  readonly id: ShopCashbackTipId;
  readonly kind: "text";
  readonly titleKey: string;
  readonly bodyKey: string;
  readonly merchantCategories?: readonly string[];
};

export type ShopCashbackTip = ShopCashbackTipHighlight | ShopCashbackTipText;

export type ShopCashbackTipsConfig = {
  readonly title: string;
  readonly tips: readonly ShopCashbackTip[];
};

export function filterShopCashbackTipsForCategory(
  tips: readonly ShopCashbackTip[],
  shopCategory: string
): ShopCashbackTip[] {
  return tips.filter((tip) => {
    if (tip.kind === "highlight" || tip.merchantCategories === undefined) {
      return true;
    }
    return tip.merchantCategories.includes(shopCategory);
  });
}

export function assertExhaustiveShopCashbackTip(tip: never): never {
  throw new Error(`Unhandled cashback tip kind: ${String(tip)}`);
}
