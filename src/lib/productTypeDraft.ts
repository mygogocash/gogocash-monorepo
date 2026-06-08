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
  /** Cashback %: raw partner number (net = raw × 0.7). */
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
    commission_info: netCommissionFromRaw(draft.commission_raw),
    commission_raw: draft.commission_raw,
    deeplink: draft.deeplink,
    description,
  };
}

/** Re-populate the draft frame from a saved row (for Edit); derives the raw % from the net when absent. */
export function productTypeEntryToDraft(
  entry: OfferProductTypeEntry,
): ProductTypeDraft {
  return {
    name: entry.name,
    description: entry.description ?? "",
    pay_in: entry.pay_in === "cash" ? "cash" : "cashback",
    commission_raw:
      entry.commission_raw ?? rawCommissionFromNet(entry.commission_info ?? ""),
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
    .map((row) => ({
      name: row.name.trim(),
      pay_in: row.pay_in ?? "cashback",
      commission_info: row.commission_info.trim(),
      amount: row.amount ?? null,
      currency: (row.currency ?? "").trim(),
      deeplink: (row.deeplink ?? "").trim(),
      description: (row.description ?? "").trim(),
      ...(row.is_tagline ? { is_tagline: true } : {}),
    }))
    .filter((row) => row.name.length > 0);
}
