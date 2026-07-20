/**
 * Shared headline cashback formatting for catalog cards + shop detail.
 * Keeps product-type fallback rules in one place (#428 review).
 */

export type ProductTypeCashbackRow = {
  is_tagline?: unknown;
  pay_in?: unknown;
  commission_info?: unknown;
};

export function formatPercentValue(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `${raw}%`;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
  }
  return null;
}

/** Highest user-facing cashback % among product-type rows (skips taglines / cash). */
export function highestProductTypeCashback(
  productType: readonly ProductTypeCashbackRow[] | null | undefined,
): string | null {
  if (!Array.isArray(productType)) return null;
  let max: number | null = null;
  for (const row of productType) {
    if (!row || typeof row !== "object") continue;
    if (row.is_tagline === true) continue;
    if (row.pay_in === "cash") continue;
    const info = row.commission_info;
    if (info == null || info === "") continue;
    const n =
      typeof info === "number" ? info : Number(String(info).replace(/%/g, ""));
    if (!Number.isFinite(n)) continue;
    if (max == null || n > max) max = n;
  }
  return max == null ? null : `${max}%`;
}

/**
 * True when `commission_store` is usable as the headline.
 * `0` / `"0"` / `"0%"` alone are treated as "no headline" when product-type
 * rates exist — admin update paths default missing commission to 0, so a
 * failed cashback save often looks like `0` + rows rather than missing.
 */
export function hasUsableCommissionStore(
  commissionStore: unknown,
  productTypeFallback: string | null,
): boolean {
  const formatted = formatPercentValue(commissionStore);
  if (!formatted) return false;
  if (!productTypeFallback) return true;
  const numeric =
    typeof commissionStore === "number"
      ? commissionStore
      : Number(String(commissionStore).replace(/%/g, "").trim());
  if (Number.isFinite(numeric) && numeric === 0) {
    return false;
  }
  return true;
}

/** Catalog cards: always return a %-string (default `0%`). */
export function formatCatalogCashback(offer: {
  commission_store?: unknown;
  product_type?: readonly ProductTypeCashbackRow[] | null;
}): string {
  const fromRows = highestProductTypeCashback(offer.product_type);
  if (hasUsableCommissionStore(offer.commission_store, fromRows)) {
    return formatPercentValue(offer.commission_store) ?? "0%";
  }
  return fromRows ?? formatPercentValue(offer.commission_store) ?? "0%";
}

/**
 * Shop detail: prefer commission_store, then partner commissions[0], then
 * product-type rows. Returns null when nothing is available (caller shows "—").
 */
export function formatMerchantCashback(offer: {
  commission_store?: unknown;
  product_type?: readonly ProductTypeCashbackRow[] | null;
  commissions?: Array<{ Commission?: string } | null> | null;
}): string | null {
  const fromRows = highestProductTypeCashback(offer.product_type);
  if (hasUsableCommissionStore(offer.commission_store, fromRows)) {
    return formatPercentValue(offer.commission_store);
  }
  const commission = offer.commissions?.[0]?.Commission?.trim();
  if (commission) {
    return commission.includes("%") ? commission : `${commission}%`;
  }
  return fromRows ?? formatPercentValue(offer.commission_store);
}
