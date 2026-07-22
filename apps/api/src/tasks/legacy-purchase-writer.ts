import { legacyPurchasePointKey } from './legacy-reward-identity';
import { parseUserIdFromAffSub1 } from 'src/withdraw/conversion-user-id.util';

const LEGACY_PURCHASE_RECONCILIATION_VERSION = 1;

export const legacyPurchaseReadyFilter = {
  legacy_point_reconciliation_status: 'ready',
  legacy_point_reconciliation_version: LEGACY_PURCHASE_RECONCILIATION_VERSION,
  legacy_point_payout_key: { $type: 'string', $gt: '' },
  quest_synthetic_reward: { $ne: true },
  offer_name: { $ne: 'reward_conversion_quest' },
} as const;

interface LegacyPurchaseConversion {
  _id: unknown;
  conversion_id: number;
  source?: string;
  provider_account?: string;
  provider_conversion_id?: string;
  network_account?: string;
  user_id?: { toString(): string } | string;
  aff_sub1?: string;
  currency?: string;
  sale_amount: number;
  legacy_point_reconciliation_status?: string;
  legacy_point_reconciliation_version?: number;
  legacy_point_payout_key?: string;
  legacy_point_amount?: number;
}

interface ConversionStateModel {
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<{ modifiedCount?: number; matchedCount?: number }>;
  findOne(filter: Record<string, unknown>): {
    lean(): Promise<LegacyPurchaseConversion | null>;
  };
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

function userIdForConversion(conversion: LegacyPurchaseConversion) {
  const direct = conversion.user_id?.toString().trim() ?? '';
  const affiliate = parseUserIdFromAffSub1(conversion.aff_sub1) ?? '';
  if (direct && affiliate && direct !== affiliate) {
    throw new Error('Purchase conversion user identity conflicts');
  }
  const userId = direct || affiliate;
  if (!userId) throw new Error('Purchase conversion user identity is missing');
  return userId;
}

function assertReadyIdentity(conversion: LegacyPurchaseConversion) {
  const payoutKey = legacyPurchasePointKey(
    conversion as unknown as Record<string, unknown>,
  );
  if (
    conversion.legacy_point_reconciliation_status !== 'ready' ||
    conversion.legacy_point_reconciliation_version !==
      LEGACY_PURCHASE_RECONCILIATION_VERSION ||
    conversion.legacy_point_payout_key !== payoutKey
  ) {
    throw new Error('Purchase conversion is not reconciled for payout');
  }
  return payoutKey;
}

/**
 * Optional follow-on invoked strictly AFTER the referee's cashback is durably
 * completed. Kept as an injected callback so this purchase writer stays
 * dependency-free and the referral bonus (MONEY / R0) is unit-tested in
 * isolation. Absence = no referral side effects (backward compatible).
 */
export type ReferralBonusHook = (input: {
  refereeUserId: string;
  sourceCashbackAmount: number;
  sourceConversionId: number;
  sourcePayoutKey: string;
}) => Promise<unknown>;

export async function awardReconciledPurchaseConversion(
  conversion: LegacyPurchaseConversion,
  dependencies: {
    conversionModel: ConversionStateModel;
    pointService: PointWriter;
    thbPerUsd: number;
    now?: Date;
    referralBonus?: ReferralBonusHook;
  },
) {
  const payoutKey = assertReadyIdentity(conversion);
  const userId = userIdForConversion(conversion);
  const currency = String(conversion.currency || 'THB').toUpperCase();
  if (!['THB', 'USD'].includes(currency)) {
    throw new Error(`Purchase conversion currency ${currency} is unsupported`);
  }
  let amount = conversion.legacy_point_amount;
  if (!Number.isFinite(amount)) {
    const computed = Math.floor(
      currency === 'USD'
        ? Number(conversion.sale_amount) * dependencies.thbPerUsd
        : Number(conversion.sale_amount),
    );
    if (!Number.isSafeInteger(computed) || computed < 0) {
      throw new Error('Purchase conversion Point amount is invalid');
    }
    const freeze = await dependencies.conversionModel.updateOne(
      {
        _id: conversion._id,
        legacy_point_reconciliation_status: 'ready',
        legacy_point_reconciliation_version:
          LEGACY_PURCHASE_RECONCILIATION_VERSION,
        legacy_point_payout_key: payoutKey,
        legacy_point_amount: { $exists: false },
      },
      { $set: { legacy_point_amount: computed } },
    );
    if (freeze.modifiedCount === 1) {
      amount = computed;
    } else {
      const winner = await dependencies.conversionModel
        .findOne({ _id: conversion._id })
        .lean();
      if (!winner) throw new Error('Purchase conversion disappeared');
      assertReadyIdentity(winner);
      amount = winner.legacy_point_amount;
    }
  }
  if (!Number.isSafeInteger(amount) || Number(amount) < 0) {
    throw new Error('Frozen purchase Point amount is invalid');
  }

  await dependencies.pointService.addPointsToUser(
    userId,
    Number(amount),
    conversion.conversion_id,
    undefined,
    payoutKey,
  );
  const completedAt = dependencies.now ?? new Date();
  const completion = await dependencies.conversionModel.updateOne(
    {
      _id: conversion._id,
      legacy_point_reconciliation_status: 'ready',
      legacy_point_reconciliation_version:
        LEGACY_PURCHASE_RECONCILIATION_VERSION,
      legacy_point_payout_key: payoutKey,
      legacy_point_amount: Number(amount),
    },
    {
      $set: {
        add_point: true,
        legacy_point_reconciliation_status: 'completed',
        legacy_point_completed_at: completedAt,
      },
    },
  );
  if (completion.matchedCount === 0) {
    const winner = await dependencies.conversionModel
      .findOne({ _id: conversion._id })
      .lean();
    if (
      winner?.legacy_point_reconciliation_status !== 'completed' ||
      winner.legacy_point_payout_key !== payoutKey ||
      winner.legacy_point_amount !== amount
    ) {
      throw new Error('Purchase conversion completion fence was lost');
    }
  }

  // Referee cashback is now durably credited + the conversion is completed.
  // Pay the referrer their percentage (idempotent + audited inside the hook).
  // Only reachable for approved+completed conversions, so reversals never pay.
  if (dependencies.referralBonus) {
    await dependencies.referralBonus({
      refereeUserId: userId,
      sourceCashbackAmount: Number(amount),
      sourceConversionId: conversion.conversion_id,
      sourcePayoutKey: payoutKey,
    });
  }

  return { payout_key: payoutKey, amount: Number(amount) };
}
