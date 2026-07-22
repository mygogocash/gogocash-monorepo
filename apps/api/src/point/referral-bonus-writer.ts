import { Types } from 'mongoose';
import {
  REFERRAL_BONUS_ACTION,
  calculateReferralBonusPoints,
  referralBonusPayoutKey,
} from './referral-bonus';

/**
 * Referral bonus payout orchestration (MONEY / R0).
 *
 * Called only AFTER a referred friend's purchase conversion has been reconciled
 * and their cashback durably credited (see `awardReconciledPurchaseConversion`).
 * Because it runs strictly on approved+completed conversions, reversed/refunded
 * conversions never reach here — that is the reversal guard rail.
 *
 * Every side effect is idempotent:
 *  - the referrer credit goes through `PointService.addPointsToUser` with a
 *    deterministic key backed by a partial-unique index, so a retried event
 *    credits at most once;
 *  - the audit row upserts on the same key, so history never duplicates.
 */

export interface ReferralBonusInput {
  /** The referred friend who just earned cashback. */
  refereeUserId: string;
  /** The friend's cashback (points) this bonus is a percentage of. */
  sourceCashbackAmount: number;
  /** Network conversion id of the friend's qualifying purchase. */
  sourceConversionId: number;
  /** The friend's own purchase payout key (namespaces the bonus key). */
  sourcePayoutKey: string;
}

interface PointWriter {
  addPointsToUser(
    userId: string,
    points: number,
    conversionId: number,
    action?: string,
    idempotencyKey?: string,
  ): Promise<unknown>;
}

interface ReferralPayoutAuditModel {
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
}

export interface ReferralBonusDeps {
  /** Kill-switch resolved by the caller (isReferralBonusEnabled()). */
  enabled: boolean;
  /** Resolve the referrer's user id for a referee, or null when none. */
  referrerLookup: (refereeUserId: string) => Promise<string | null>;
  /** Current referral_bonus_percent from the FeeRate singleton. */
  feeRatePercentProvider: () => Promise<number>;
  pointService: PointWriter;
  referralPayoutModel: ReferralPayoutAuditModel;
  now?: Date;
}

export type ReferralBonusResult =
  | { status: 'disabled' }
  | { status: 'no_referrer' }
  | { status: 'self_referral' }
  | { status: 'zero_bonus' }
  | {
      status: 'paid';
      referrerId: string;
      bonus: number;
      percent: number;
      idempotency_key: string;
    };

export async function awardReferralBonusForConversion(
  input: ReferralBonusInput,
  deps: ReferralBonusDeps,
): Promise<ReferralBonusResult> {
  if (!deps.enabled) return { status: 'disabled' };

  const referrerId = (await deps.referrerLookup(input.refereeUserId))
    ?.toString()
    .trim();
  if (!referrerId) return { status: 'no_referrer' };
  if (referrerId === input.refereeUserId.toString().trim()) {
    return { status: 'self_referral' };
  }

  const percent = await deps.feeRatePercentProvider();
  // Throws on a negative/NaN source (reversal) — fail closed.
  const bonus = calculateReferralBonusPoints(
    input.sourceCashbackAmount,
    percent,
  );
  if (bonus <= 0) return { status: 'zero_bonus' };

  const key = referralBonusPayoutKey(input.sourcePayoutKey);

  // 1) Credit the referrer (idempotent via the unique ledger key).
  await deps.pointService.addPointsToUser(
    referrerId,
    bonus,
    input.sourceConversionId,
    REFERRAL_BONUS_ACTION,
    key,
  );

  // 2) Append the immutable audit row (idempotent upsert on the same key).
  const createdAt = deps.now ?? new Date();
  const clampedPercent = Math.min(100, Math.max(0, percent));
  await deps.referralPayoutModel.updateOne(
    { idempotency_key: key },
    {
      $setOnInsert: {
        referrer_id: new Types.ObjectId(referrerId),
        referee_id: new Types.ObjectId(input.refereeUserId),
        source_conversion_id: input.sourceConversionId,
        source_payout_key: input.sourcePayoutKey,
        source_amount: input.sourceCashbackAmount,
        percent: clampedPercent,
        bonus_amount: bonus,
        idempotency_key: key,
        createdAt,
      },
    },
    { upsert: true },
  );

  return {
    status: 'paid',
    referrerId,
    bonus,
    percent: clampedPercent,
    idempotency_key: key,
  };
}
