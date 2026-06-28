import type { Offer } from "@/types/api";

function parseCommissionPercentString(s: unknown): number | null {
  if (s == null) return null;
  const str = typeof s === "string" ? s : String(s);
  const m = str.trim().match(/([\d.]+)\s*%/);
  if (!m) return null;
  const parsed = parseFloat(m[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function collectPercentsFromPartnerRates(commissions: unknown[]): number[] {
  const percents: number[] = [];
  for (const row of commissions) {
    if (row != null && typeof row === "object" && !Array.isArray(row)) {
      for (const value of Object.values(row as Record<string, unknown>)) {
        const percent = parseCommissionPercentString(value);
        if (percent != null) percents.push(percent);
      }
    } else {
      const percent = parseCommissionPercentString(row);
      if (percent != null) percents.push(percent);
    }
  }
  return percents;
}

/** Min / max % across partner rate strings or Involve-style commission rows. */
export function formatPartnerRatesMinMax(
  offer: Pick<Offer, "commissions"> | null,
): string {
  const percents = collectPercentsFromPartnerRates(offer?.commissions ?? []);
  if (percents.length === 0) return "—";
  const min = Math.min(...percents);
  const max = Math.max(...percents);
  if (min === max) return `${min}%`;
  return `Min ${min}% · Max ${max}%`;
}

/**
 * Best partner % from commission data.
 * Handles both string arrays (`["5%"]`) and Involve Asia object arrays
 * (`[{ "Commission": "2.80%" }]`).
 */
export function bestPercentFromPartnerRates(commissions: unknown[]): number {
  let max = 0;
  for (const c of commissions) {
    if (c != null && typeof c === "object") {
      // Involve Asia format: { "Commission": "2.80%", ... }
      for (const val of Object.values(c as Record<string, unknown>)) {
        const p = parseCommissionPercentString(val);
        if (p != null && p > max) max = p;
      }
    } else {
      const p = parseCommissionPercentString(c);
      if (p != null && p > max) max = p;
    }
  }
  return max;
}

/**
 * Partner-style suggested app tracking-link URL (aligned with mock `/admin/commission-management/brands` `appDeeplink` fallback).
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
