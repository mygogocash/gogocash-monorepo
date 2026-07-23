import { DEFAULT_PLATFORM_FEE_PERCENT } from "@/lib/commissionFee";
import {
  netCommissionFromRaw,
  rawCommissionFromNet,
} from "@/lib/productTypeCommission";
import type { OfferProductTypeEntry } from "@/types/api";

/** Local draft for the "add a product type" frame; committed into product_types on Add. */
export type ProductTypeDraft = {
  name: string;
  /** Optional free-text subtitle shown under the name in the product-types table. */
  description: string;
  pay_in: "cashback" | "cash";
  /** Cashback %: raw partner number (net = raw × (1 − fee/100)). */
  commission_raw: string;
  /** Cash: amount (string for clean typing). */
  amount: string;
  /** Cash: currency code. */
  currency: string;
  /** Carried through Edit→Add so the row's tracking link survives (not edited here). */
  deeplink: string;
};

export const EMPTY_PRODUCT_TYPE_DRAFT: ProductTypeDraft = {
  name: "",
  description: "",
  pay_in: "cashback",
  commission_raw: "",
  amount: "",
  currency: "THB",
  deeplink: "",
};

/** Build the persisted product-type row from a draft (name trimmed; cash amount coerced to a number or null). */
export function productTypeDraftToEntry(
  draft: ProductTypeDraft,
  feePercent: number = DEFAULT_PLATFORM_FEE_PERCENT,
): OfferProductTypeEntry {
  const name = draft.name.trim();
  const description = draft.description.trim();
  if (draft.pay_in === "cash") {
    const n = Number(draft.amount);
    const amount =
      draft.amount.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n;
    return {
      name,
      pay_in: "cash",
      commission_info: "",
      amount,
      currency: draft.currency,
      deeplink: draft.deeplink,
      description,
    };
  }
  return {
    name,
    pay_in: "cashback",
    commission_info: netCommissionFromRaw(draft.commission_raw, feePercent),
    commission_raw: draft.commission_raw,
    deeplink: draft.deeplink,
    description,
  };
}

/** Re-populate the draft frame from a saved row (for Edit); derives the raw % from the net when absent. */
export function productTypeEntryToDraft(
  entry: OfferProductTypeEntry,
  feePercent: number = DEFAULT_PLATFORM_FEE_PERCENT,
): ProductTypeDraft {
  return {
    name: entry.name,
    description: entry.description ?? "",
    pay_in: entry.pay_in === "cash" ? "cash" : "cashback",
    commission_raw:
      entry.commission_raw ??
      rawCommissionFromNet(entry.commission_info ?? "", feePercent),
    amount: entry.amount != null ? String(entry.amount) : "",
    currency: entry.currency || "THB",
    deeplink: entry.deeplink ?? "",
  };
}

/**
 * Whitelist + normalize product-type rows for the `product_types` save payload:
 * trim string fields, default pay_in/amount/currency, and drop blank-name rows.
 * Shared by the form-wide save and the partner-info section save so the two
 * never drift (e.g. when a new field like `description` is added).
 */
export function serializeOfferProductTypes(
  rows: OfferProductTypeEntry[],
): OfferProductTypeEntry[] {
  return rows
    .map((row) => {
      const commission = (row.commission_info ?? "").trim();
      return {
        name: row.name.trim(),
        pay_in: row.pay_in ?? "cashback",
        commission_info: commission,
        // Mirror the rate onto `minimum`, the key the affiliate feed and the API's
        // ProductTypeDto use (#516). The API persists product_type as a free-form
        // `{[key: string]: string}[]` with no row validation, so whichever key the
        // admin omits is simply dropped — emitting only `commission_info` silently
        // erased the partner rate on every feed-imported row.
        minimum: commission,
        amount: row.amount ?? null,
        currency: (row.currency ?? "").trim(),
        deeplink: (row.deeplink ?? "").trim(),
        description: (row.description ?? "").trim(),
        ...(row.is_tagline ? { is_tagline: true } : {}),
      };
    })
    .filter((row) => row.name.length > 0);
}

/**
 * The highest user-facing cashback % (net `commission_info`) among the
 * product-type rows. Ignores tagline headings and cash pay-in rows, and skips
 * blank / non-numeric values. Returns null when there are no cashback rows.
 * Used to auto-fill the single offer commission when per-row rates are in play.
 */
export function highestCashbackPercent(
  rows: OfferProductTypeEntry[],
): number | null {
  let max: number | null = null;
  for (const row of rows) {
    if (row.is_tagline) continue;
    if (row.pay_in === "cash") continue;
    if (row.commission_info.trim() === "") continue;
    const n = Number(row.commission_info);
    if (!Number.isFinite(n)) continue;
    if (max === null || n > max) max = n;
  }
  return max;
}
