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

function readWalletAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/** Normalize POST /withdraw/check payloads before resource + UI guards run. */
export function normalizeCheckWithdrawResponse(payload: unknown): CheckWithdrawResponse | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const netAmountTHB = readWalletAmount(candidate.netAmountTHB);
  const totalPayoutTHB = readWalletAmount(candidate.totalPayoutTHB);

  if (netAmountTHB === null || totalPayoutTHB === null) {
    return null;
  }

  return {
    netAmount: readWalletAmount(candidate.netAmount) ?? netAmountTHB,
    netAmountTHB,
    totalPayoutTHB,
    totalPayoutUSD: readWalletAmount(candidate.totalPayoutUSD) ?? totalPayoutTHB,
  };
}

/** Narrow an unknown backend payload to the withdraw-check totals. */
export function isCheckWithdrawResponse(payload: unknown): payload is CheckWithdrawResponse {
  return normalizeCheckWithdrawResponse(payload) !== null;
}

export function isWalletResourceBlocking(
  status: "disabled" | "empty" | "error" | "loading" | "offline" | "ready",
): boolean {
  return status === "loading" || status === "error" || status === "offline" || status === "disabled";
}
