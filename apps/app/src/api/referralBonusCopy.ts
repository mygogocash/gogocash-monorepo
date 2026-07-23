// Dynamic customer copy for the Share & Earn referral card. The percentage is
// the single source of truth from the backend (FeeRate.referral_bonus_percent,
// served by GET /admin/referral-bonus-percent). When the live value is missing
// or out of range we keep the marketing fixture copy so the card never renders
// a broken or misleading bonus (e.g. "0%").

export interface ReferralCardCopy {
  title: string;
  subtitle: string;
  body: string;
  actionLabel: string;
}

function formatPercent(percent: number): string {
  // Whole numbers render clean ("10"); fractional keep up to one decimal.
  return Number.isInteger(percent) ? String(percent) : String(percent);
}

/**
 * Build the referral card copy for a live percent, falling back to the fixture
 * copy when the percent is absent or outside the payable 1-100 range.
 */
export function buildReferralCardCopy(
  percent: number | undefined,
  fallback: ReferralCardCopy,
): ReferralCardCopy {
  if (
    typeof percent !== "number" ||
    !Number.isFinite(percent) ||
    percent <= 0 ||
    percent > 100
  ) {
    return fallback;
  }
  const n = formatPercent(percent);
  return {
    title: `${n}% Cashback Bonus`,
    subtitle: `Share & earn ${n}% friend cashback payout`,
    body: `Share your referral link. You earn ${n}% cashback payout whenever your friend receives cashback in their wallet.`,
    actionLabel: fallback.actionLabel,
  };
}
