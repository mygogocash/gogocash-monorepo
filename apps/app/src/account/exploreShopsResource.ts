/**
 * #586 REQ-APP-2 — map the public GET /explore/shops envelope (Involve
 * Commission Xtra shops) into the BrandDirectoryStore shape the shop directory
 * already renders. Flag-gated at the call site; on an empty/error feed this
 * yields [] and the directory falls back to the existing offer path (REQ-APP-7).
 */
import type { BrandDirectoryStore } from "@mobile/screens/discovery/discoveryTypes";

// A single row from GET /explore/shops (display-safe projection, see ExploreService).
export type ExploreShopRow = {
  shopId?: number;
  shopName?: string;
  shopType?: string;
  shopLink?: string;
  shopImage?: string;
  cashbackRate?: number;
  trackingLink?: string;
  categoryKey?: string | null;
  country?: string;
  offerId?: string | null;
};

export type ExploreShopsPayload = {
  data?: ExploreShopRow[];
} | null;

// Cosmetic tints so cards stay visually distinct (mirrors topBrandResource).
const TINTS = ["#EAF4FF", "#FFF3E8", "#EAFBF3", "#F3ECFF", "#FFECF0"] as const;

/**
 * Boosted cashback → display percent. `cashbackRate` is a fraction (0.015),
 * shown as "1.5%". OPEN-4 (raw boosted vs after-margin) is deferred to the
 * founder; v1 shows the boosted rate directly.
 */
export function formatXtraCashback(rate: number | undefined): string {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return "";
  const percent = Number((rate * 100).toFixed(2));
  return `${percent}%`;
}

export function mapExploreShopsToDirectoryStores(
  payload: ExploreShopsPayload,
): BrandDirectoryStore[] {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const stores: BrandDirectoryStore[] = [];
  rows.forEach((row, index) => {
    const shopName = row.shopName?.trim();
    const cashback = formatXtraCashback(row.cashbackRate);
    if (!shopName || !cashback) return; // skip unusable rows
    // Prefer the internal shop-detail route (mint/redirect keeps attribution,
    // REQ-APP-5) when the parent Offer resolved; otherwise the external shop link.
    const href = row.offerId
      ? `/shop/${row.offerId}`
      : (row.shopLink?.trim() ?? "");
    if (!href) return;
    stores.push({
      addedAt: "",
      brand: shopName,
      cashback,
      category: "",
      href,
      id: `xtra-${row.shopId ?? index}`,
      label: "",
      logoUri: row.shopImage?.trim() ?? "",
      popularity: index + 1,
      position: index + 1,
      showGrabCoupon: false,
      // Keep the generic type so the directory's shopType filter never hides an
      // Xtra shop; the boosted-cashback distinction rides on `isXtra` (the badge).
      shopType: "normal",
      tint: TINTS[index % TINTS.length],
      isXtra: true,
    });
  });
  return stores;
}
