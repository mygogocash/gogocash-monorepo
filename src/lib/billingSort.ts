/** Sort keys for the Benefits-tab billing-history table. */
export type BillingSortKey =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc"
  | "benefit"
  | "method"
  | "status";

type SortableBillingRow = {
  date: string;
  amount: number;
  benefit: string;
  method: string;
  status: string;
};

/**
 * Return a NEW array of billing rows sorted by the given key.
 * Dates are ISO (YYYY-MM-DD), so a lexicographic compare is chronological.
 */
export function sortBilling<T extends SortableBillingRow>(
  rows: T[],
  key: BillingSortKey,
): T[] {
  const out = [...rows];
  switch (key) {
    case "date-asc":
      return out.sort((a, b) => a.date.localeCompare(b.date));
    case "date-desc":
      return out.sort((a, b) => b.date.localeCompare(a.date));
    case "amount-asc":
      return out.sort((a, b) => a.amount - b.amount);
    case "amount-desc":
      return out.sort((a, b) => b.amount - a.amount);
    case "benefit":
      return out.sort((a, b) => a.benefit.localeCompare(b.benefit));
    case "method":
      return out.sort((a, b) => a.method.localeCompare(b.method));
    case "status":
      return out.sort((a, b) => a.status.localeCompare(b.status));
    default:
      return out;
  }
}

/** Categorical fields the billing table can be filtered by. */
export type BillingFilterField = "benefit" | "method" | "status";

/**
 * Filter billing rows to those whose `field` exactly equals `value`.
 * An empty `value` means "All" — every row is returned.
 */
export function filterBilling<T extends SortableBillingRow>(
  rows: T[],
  field: BillingFilterField,
  value: string,
): T[] {
  if (!value) return rows;
  return rows.filter((row) => row[field] === value);
}
