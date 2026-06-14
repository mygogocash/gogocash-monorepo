// Backend DTO for POST /withdraw/check (FirebaseAuthGuard). Money path: only
// the totals the wallet summary renders are typed; the rest of the payout
// object (fees, conversions, MCB breakdown) passes through untyped. The
// endpoint exposes approved/net totals only — pending and withdrawn-history
// amounts have no source here (follow-up endpoint), so live mode renders
// those as zeros rather than leaking fixture numbers.
export type CheckWithdrawResponse = {
  netAmount: number;
  netAmountTHB: number;
  totalPayoutTHB: number;
  totalPayoutUSD: number;
};

/** Narrow an unknown backend payload to the withdraw-check totals. */
export function isCheckWithdrawResponse(payload: unknown): payload is CheckWithdrawResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return false;
  }
  const candidate = payload as { netAmountTHB?: unknown; totalPayoutTHB?: unknown };
  return (
    typeof candidate.netAmountTHB === "number" && typeof candidate.totalPayoutTHB === "number"
  );
}
