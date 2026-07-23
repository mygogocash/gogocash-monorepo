/**
 * Referral bonus payout — pure calculation + identity helpers.
 *
 * MONEY (R0). The referrer earns `referral_bonus_percent`% of a referred
 * friend's *approved* cashback. The single source of truth for the percentage
 * is `FeeRate.referral_bonus_percent` (the withdraw fee singleton edited by the
 * superadmin Fee Structure screen) — NOT the dangling `ReferralConfig` schema
 * and NOT the flat 50-point signup grant in `auth.service.updatePoint`. Those
 * two legacy paths are intentionally left untouched here and are tracked for a
 * later reconciliation; this engine is additive and gated OFF by default.
 */

/** Ledger `action` for referrer bonus Point rows (distinct from 'referral'). */
export const REFERRAL_BONUS_ACTION = 'referral_bonus';

/**
 * Default percentage when the FeeRate singleton has no explicit value yet.
 * Mirrors the FeeRate.referral_bonus_percent schema default so a fresh DB and
 * the customer copy agree before an admin ever touches the Fee screen.
 */
export const REFERRAL_BONUS_DEFAULT_PERCENT = 10;

/**
 * Kill-switch. OPT-IN: only the literal string 'true' enables payouts, so a
 * missing/typo'd variable can never silently start moving money. Mirrors the
 * QUEST_TASK_V2_ENABLED idiom (not the WITHDRAWALS_ENABLED default-on idiom).
 */
export function isReferralBonusEnabled(
  raw: string | undefined = process.env.REFERRAL_BONUS_ENABLED,
): boolean {
  return raw?.trim().toLowerCase() === 'true';
}

/**
 * Bonus points = floor(sourceCashback * clampedPercent / 100).
 *
 * - percent is clamped to [0, 100]; a negative percent yields 0 (never a
 *   clawback) and >100 is capped so the bonus can never exceed the source.
 * - sourceCashback must be a finite, non-negative number. A negative/NaN source
 *   (e.g. a reversed conversion) throws — the caller must never reach here for a
 *   reversal, and failing closed is safer than paying garbage.
 */
export function calculateReferralBonusPoints(
  sourceCashback: number,
  percent: number,
): number {
  if (!Number.isFinite(sourceCashback) || sourceCashback < 0) {
    throw new Error('Referral bonus source cashback must be a non-negative number');
  }
  if (!Number.isFinite(percent)) {
    throw new Error('Referral bonus percent must be a finite number');
  }
  const clampedPercent = Math.min(100, Math.max(0, percent));
  if (clampedPercent === 0 || sourceCashback === 0) return 0;
  return Math.floor((sourceCashback * clampedPercent) / 100);
}

/**
 * Deterministic idempotency key for a referrer bonus, namespaced off the
 * referee's own purchase payout key so the same qualifying conversion can pay
 * the referrer at most once (enforced by the partial-unique index on
 * Point.idempotency_key and the referralpayouts audit collection).
 */
export function referralBonusPayoutKey(sourcePayoutKey: string): string {
  const normalized = String(sourcePayoutKey ?? '').trim();
  if (!normalized) {
    throw new Error('Referral bonus requires a source payout key');
  }
  return `referral:bonus:v1:source:${normalized}`;
}
