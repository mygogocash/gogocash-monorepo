import { Model, Types } from 'mongoose';
import type { Point } from './schemas/point.schema';
import type { FeeRate } from 'src/withdraw/schemas/feeRate.schema';
import type { ReferralPayout } from './schemas/referral-payout.schema';
import {
  REFERRAL_BONUS_DEFAULT_PERCENT,
  isReferralBonusEnabled,
} from './referral-bonus';
import {
  awardReferralBonusForConversion,
  type ReferralBonusInput,
  type ReferralBonusResult,
} from './referral-bonus-writer';

/**
 * Look up the referrer for a given referred friend.
 *
 * The referral edge is recorded at signup by `auth.service.updatePoint` as a
 * Point row with `user_id = referrer`, `referral_id = referee`,
 * `action = 'referral'`. So the referrer of `refereeUserId` is the `user_id` of
 * that row. Returns null when the friend was never referred.
 */
export async function resolveReferrerId(
  pointModel: Pick<Model<Point>, 'findOne'>,
  refereeUserId: string,
): Promise<string | null> {
  const row = await pointModel
    .findOne({
      referral_id: new Types.ObjectId(refereeUserId),
      action: 'referral',
      type: 'add',
    })
    .lean();
  const referrer = (row as { user_id?: unknown } | null)?.user_id;
  return referrer ? String(referrer) : null;
}

/**
 * Single source of truth for the referral bonus percentage:
 * FeeRate.referral_bonus_percent on the fee singleton. Falls back to the schema
 * default when the singleton or field is absent (fresh DB / pre-migration).
 */
export async function resolveReferralBonusPercent(
  feeRateModel: Pick<Model<FeeRate>, 'findOne'>,
): Promise<number> {
  const row = await feeRateModel.findOne().lean();
  const value = (row as { referral_bonus_percent?: unknown } | null)
    ?.referral_bonus_percent;
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : REFERRAL_BONUS_DEFAULT_PERCENT;
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

/**
 * Compose the injected models into the `referralBonus` hook consumed by
 * `awardReconciledPurchaseConversion`. Reading the kill-switch per-invocation
 * lets the flag flip without a redeploy.
 */
export function buildReferralBonusHook(deps: {
  pointModel: Pick<Model<Point>, 'findOne'>;
  feeRateModel: Pick<Model<FeeRate>, 'findOne'>;
  referralPayoutModel: Pick<Model<ReferralPayout>, 'updateOne'>;
  pointService: PointWriter;
}): (input: ReferralBonusInput) => Promise<ReferralBonusResult> {
  return (input: ReferralBonusInput) =>
    awardReferralBonusForConversion(input, {
      enabled: isReferralBonusEnabled(),
      referrerLookup: (refereeId) =>
        resolveReferrerId(deps.pointModel, refereeId),
      feeRatePercentProvider: () =>
        resolveReferralBonusPercent(deps.feeRateModel),
      pointService: deps.pointService,
      referralPayoutModel: deps.referralPayoutModel,
    });
}
