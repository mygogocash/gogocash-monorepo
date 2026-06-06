export interface CashbackRequestRow {
  conversion_id: number;
  offer_name?: string | null;
  conversion_status?: string | null;
  payout?: number | string;
  affiliate_remarks?: string | null;
}

/**
 * Pending "Extra cashback" requests awaiting super-admin review, extracted from
 * a user's conversion list (offer "Extra cashback" + status "pending").
 */
export function pendingExtraCashbackRequests<T extends CashbackRequestRow>(
  conversions: readonly T[],
): T[] {
  return conversions.filter(
    (c) =>
      c.offer_name === "Extra cashback" && c.conversion_status === "pending",
  );
}
