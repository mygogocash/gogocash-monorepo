import type { DataOffer, ProductTypeList } from "@/interfaces/offer";

/** Same ordering as merchant detail “product type” rows (low → high cashback). */
export function sortedProductTypes(offer: DataOffer | undefined): ProductTypeList[] {
  if (!offer?.product_type?.length) return [];
  return [...offer.product_type].sort((a, b) => Number(a?.minimum) - Number(b?.minimum));
}
