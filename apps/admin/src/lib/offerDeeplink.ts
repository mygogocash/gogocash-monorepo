import type { Offer } from "@/types/api";
import { applyThirtyPercentFee } from "@/lib/commissionFee";

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

/** Best partner % from commission data. */
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

type OfferCashbackFields = Pick<
  Offer,
  "commission_store" | "commissions"
>;

/** Customer-facing cashback label derived from offer commission fields. */
export function formatOfferCashbackLabel(
  offer: OfferCashbackFields | null | undefined,
): string {
  if (!offer) return "";

  const store = offer.commission_store;
  if (typeof store === "number" && Number.isFinite(store) && store > 0) {
    return `${store}%`;
  }
  if (store != null && String(store).trim()) {
    const trimmed = String(store).trim();
    const asNum = Number(trimmed.replace(/%/g, ""));
    if (Number.isFinite(asNum) && asNum <= 0) {
      // Treat zero as unset — fall through to partner rates.
    } else {
      return trimmed.includes("%") ? trimmed : `${trimmed}%`;
    }
  }

  const percents = collectPercentsFromPartnerRates(offer.commissions ?? []);
  if (percents.length === 0) return "";

  const max = Math.max(...percents);
  const min = Math.min(...percents);
  const userFacingMax = applyThirtyPercentFee(max);
  if (min !== max) return `${userFacingMax}%`;
  return `${userFacingMax}%`;
}

/** Strip verbose prefixes from labels shown on compact brand cards. */
export function compactCustomerCashbackLabel(label: string | null | undefined): string {
  const trimmed = String(label ?? "").trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/^up to\s+/i, "");
}

/** Saved top-brand cashback, or offer-derived label when saved is blank. */
export function resolveTopBrandCashbackLabel(
  offer: OfferCashbackFields | null | undefined,
  savedCashback?: string | null,
): string {
  const saved = compactCustomerCashbackLabel(savedCashback);
  if (saved) return saved;
  return compactCustomerCashbackLabel(formatOfferCashbackLabel(offer));
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
