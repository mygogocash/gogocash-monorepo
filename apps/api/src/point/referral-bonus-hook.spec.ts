import { Types } from 'mongoose';
import {
  resolveReferralBonusPercent,
  resolveReferrerId,
} from './referral-bonus-hook';
import { REFERRAL_BONUS_DEFAULT_PERCENT } from './referral-bonus';

describe('resolveReferrerId', () => {
  it('maps the friend (referee) to their referrer via the signup referral Point', async () => {
    const referrer = new Types.ObjectId();
    const refereeId = new Types.ObjectId().toHexString();
    const captured: any = {};
    const pointModel = {
      findOne: jest.fn((filter: any) => {
        captured.filter = filter;
        return { lean: async () => ({ user_id: referrer }) };
      }),
    };

    const result = await resolveReferrerId(pointModel as any, refereeId);

    expect(result).toBe(referrer.toHexString());
    // The referral edge is stored as user_id=referrer, referral_id=referee.
    expect(captured.filter.action).toBe('referral');
    expect(captured.filter.type).toBe('add');
    expect(String(captured.filter.referral_id)).toBe(refereeId);
  });

  it('returns null when the friend was never referred', async () => {
    const pointModel = {
      findOne: jest.fn(() => ({ lean: async () => null })),
    };
    expect(
      await resolveReferrerId(
        pointModel as any,
        new Types.ObjectId().toHexString(),
      ),
    ).toBeNull();
  });
});

describe('resolveReferralBonusPercent', () => {
  it('reads referral_bonus_percent from the FeeRate singleton', async () => {
    const feeRateModel = {
      findOne: jest.fn(() => ({
        lean: async () => ({ referral_bonus_percent: 15 }),
      })),
    };
    expect(await resolveReferralBonusPercent(feeRateModel as any)).toBe(15);
  });

  it('falls back to the default when the singleton or field is missing', async () => {
    const feeRateModel = {
      findOne: jest.fn(() => ({ lean: async () => null })),
    };
    expect(await resolveReferralBonusPercent(feeRateModel as any)).toBe(
      REFERRAL_BONUS_DEFAULT_PERCENT,
    );
  });
});
