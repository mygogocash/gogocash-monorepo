import { Types } from 'mongoose';
import { legacyPurchasePointKey } from './legacy-reward-identity';
import { awardReconciledPurchaseConversion } from './legacy-purchase-writer';

function readyConversion(overrides: Record<string, unknown> = {}) {
  const userId = new Types.ObjectId().toHexString();
  const conversion = {
    _id: new Types.ObjectId(),
    conversion_id: 42,
    source: 'involve',
    provider_account: 'th',
    provider_conversion_id: 'provider-42',
    user_id: userId,
    aff_sub1: `user_id:${userId}`,
    currency: 'THB',
    sale_amount: 125,
    legacy_point_reconciliation_status: 'ready',
    legacy_point_reconciliation_version: 1,
    ...overrides,
  };
  return {
    ...conversion,
    legacy_point_payout_key:
      typeof overrides.legacy_point_payout_key === 'string'
        ? overrides.legacy_point_payout_key
        : legacyPurchasePointKey(conversion),
  };
}

describe('awardReconciledPurchaseConversion', () => {
  it('rejects an attacker-controlled payout key before writing a Point', async () => {
    const conversion = readyConversion({
      legacy_point_payout_key: 'legacy:purchase:conversion:attacker',
    });
    const conversionModel = {
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };
    const pointService = { addPointsToUser: jest.fn() };

    await expect(
      awardReconciledPurchaseConversion(conversion, {
        conversionModel: conversionModel as never,
        pointService,
        thbPerUsd: 35,
      }),
    ).rejects.toThrow(/not reconciled/i);
    expect(conversionModel.updateOne).not.toHaveBeenCalled();
    expect(pointService.addPointsToUser).not.toHaveBeenCalled();
  });

  it('freezes the USD amount before the Point and reuses it after a crash and rate change', async () => {
    const conversion = readyConversion({ currency: 'USD', sale_amount: 10 });
    const state = { ...conversion } as Record<string, unknown>;
    let failFirstCompletion = true;
    const conversionModel = {
      updateOne: jest.fn(
        async (
          filter: Record<string, unknown>,
          update: { $set: Record<string, unknown> },
        ) => {
          if (
            typeof filter.legacy_point_amount === 'object' &&
            filter.legacy_point_amount !== null
          ) {
            if (state.legacy_point_amount !== undefined) {
              return { modifiedCount: 0, matchedCount: 0 };
            }
            Object.assign(state, update.$set);
            return { modifiedCount: 1, matchedCount: 1 };
          }
          if (failFirstCompletion) {
            failFirstCompletion = false;
            return { modifiedCount: 0, matchedCount: 0 };
          }
          Object.assign(state, update.$set);
          return { modifiedCount: 1, matchedCount: 1 };
        },
      ),
      findOne: jest.fn(() => ({
        lean: jest.fn(async () => ({ ...state })),
      })),
    };
    const effects = new Map<string, number>();
    const pointService = {
      addPointsToUser: jest.fn(
        async (
          _userId: string,
          amount: number,
          _conversionId: number,
          _action: string | undefined,
          payoutKey: string,
        ) => effects.set(payoutKey, amount),
      ),
    };

    await expect(
      awardReconciledPurchaseConversion(conversion, {
        conversionModel: conversionModel as never,
        pointService,
        thbPerUsd: 35,
      }),
    ).rejects.toThrow(/completion fence/i);
    await expect(
      awardReconciledPurchaseConversion(conversion, {
        conversionModel: conversionModel as never,
        pointService,
        thbPerUsd: 40,
      }),
    ).resolves.toEqual({
      payout_key: conversion.legacy_point_payout_key,
      amount: 350,
    });

    expect(effects).toEqual(
      new Map([[conversion.legacy_point_payout_key, 350]]),
    );
    expect(state).toMatchObject({
      legacy_point_amount: 350,
      legacy_point_reconciliation_status: 'completed',
      add_point: true,
    });
  });

  it('rejects conflicting direct and affiliate user identities', async () => {
    const conversion = readyConversion({
      aff_sub1: `user_id:${new Types.ObjectId().toHexString()}`,
    });
    const pointService = { addPointsToUser: jest.fn() };

    await expect(
      awardReconciledPurchaseConversion(conversion, {
        conversionModel: {
          updateOne: jest.fn(),
          findOne: jest.fn(),
        } as never,
        pointService,
        thbPerUsd: 35,
      }),
    ).rejects.toThrow(/identity conflicts/i);
    expect(pointService.addPointsToUser).not.toHaveBeenCalled();
  });

  it('rejects a ready conversion whose currency has no immutable quote', async () => {
    const conversion = readyConversion({
      currency: 'EUR',
      sale_amount: 100,
      legacy_point_amount: 100,
    });
    const pointService = { addPointsToUser: jest.fn() };

    await expect(
      awardReconciledPurchaseConversion(conversion, {
        conversionModel: {
          updateOne: jest.fn(),
          findOne: jest.fn(),
        } as never,
        pointService,
        thbPerUsd: 35,
      }),
    ).rejects.toThrow(/currency/i);
    expect(pointService.addPointsToUser).not.toHaveBeenCalled();
  });

  it('invokes the optional referralBonus hook AFTER completion with the credited amount', async () => {
    const conversion = readyConversion({ currency: 'THB', sale_amount: 200 });
    const state = { ...conversion } as Record<string, unknown>;
    const conversionModel = {
      updateOne: jest.fn(async (filter: any, update: { $set: any }) => {
        Object.assign(state, update.$set);
        return { modifiedCount: 1, matchedCount: 1 };
      }),
      findOne: jest.fn(),
    };
    const pointService = { addPointsToUser: jest.fn(async () => ({})) };
    const referralBonus = jest.fn(async () => ({ status: 'paid' as const }));

    const result = await awardReconciledPurchaseConversion(conversion, {
      conversionModel: conversionModel as never,
      pointService,
      thbPerUsd: 35,
      referralBonus,
    });

    expect(result).toEqual({
      payout_key: conversion.legacy_point_payout_key,
      amount: 200,
    });
    expect(referralBonus).toHaveBeenCalledTimes(1);
    expect(referralBonus).toHaveBeenCalledWith({
      refereeUserId: conversion.user_id,
      sourceCashbackAmount: 200,
      sourceConversionId: conversion.conversion_id,
      sourcePayoutKey: conversion.legacy_point_payout_key,
    });
    // referee credited before the referrer bonus hook fires
    expect(pointService.addPointsToUser).toHaveBeenCalledTimes(1);
  });

  it('stays backward compatible: no referralBonus dep -> no referral side effects', async () => {
    const conversion = readyConversion({ currency: 'THB', sale_amount: 200 });
    const state = { ...conversion } as Record<string, unknown>;
    const conversionModel = {
      updateOne: jest.fn(async (filter: any, update: { $set: any }) => {
        Object.assign(state, update.$set);
        return { modifiedCount: 1, matchedCount: 1 };
      }),
      findOne: jest.fn(),
    };
    const pointService = { addPointsToUser: jest.fn(async () => ({})) };

    await expect(
      awardReconciledPurchaseConversion(conversion, {
        conversionModel: conversionModel as never,
        pointService,
        thbPerUsd: 35,
      }),
    ).resolves.toEqual({
      payout_key: conversion.legacy_point_payout_key,
      amount: 200,
    });
  });
});
