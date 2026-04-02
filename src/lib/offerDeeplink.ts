import type { Offer } from "@/types/api";

function parseCommissionPercentString(s: string): number | null {
  const m = s.trim().match(/([\d.]+)\s*%/);
  if (m) return parseFloat(m[1]);
  return null;
}

/** Best partner % from rate strings (e.g. `"5%"`, `"3% CPA"`). */
export function bestPercentFromPartnerRates(commissions: string[]): number {
  let max = 0;
  for (const c of commissions) {
    const p = parseCommissionPercentString(c);
    if (p != null && p > max) max = p;
  }
  return max;
}

/**
 * Partner-style suggested app URL (aligned with mock `/admin/commission-management/brands` `appDeeplink` fallback).
 * `adminCommissionStore` is the value from the edit form when present so preview updates as admins edit Commission (%).
 */
export function buildSuggestedAppDeeplink(
  offer: Pick<Offer, "_id" | "lookup_value" | "currency" | "commissions" | "commission_store">,
  affiliateNetworkId: string,
  adminCommissionStore: number | null | undefined,
  /** Advertiser / market (`global` omits `store` query param). */
  storeId: string,
): string {
  const fromPartner = bestPercentFromPartnerRates(offer.commissions ?? []);
  const adminRate = adminCommissionStore ?? offer.commission_store;
  const rate =
    fromPartner > 0 ? fromPartner : adminRate != null && !Number.isNaN(Number(adminRate)) ? Number(adminRate) : 0;
  const safeLookup = encodeURIComponent(offer.lookup_value || offer._id);
  const net = affiliateNetworkId.trim() || "involve_asia";
  const q = new URLSearchParams();
  q.set("bestRate", String(rate));
  q.set("currency", offer.currency || "THB");
  q.set("affNetwork", net);
  const sid = storeId.trim();
  if (sid && sid !== "global") {
    q.set("store", sid);
  }
  return `https://gogocash.app/open/offer/${safeLookup}?${q.toString()}`;
}
