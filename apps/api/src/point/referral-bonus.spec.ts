import {
  REFERRAL_BONUS_ACTION,
  calculateReferralBonusPoints,
  isReferralBonusEnabled,
  referralBonusPayoutKey,
} from './referral-bonus';

describe('isReferralBonusEnabled', () => {
  it('is OFF by default (unset env)', () => {
    expect(isReferralBonusEnabled(undefined)).toBe(false);
  });

  it('is OFF for any non-"true" value (fail closed)', () => {
    expect(isReferralBonusEnabled('false')).toBe(false);
    expect(isReferralBonusEnabled('1')).toBe(false);
    expect(isReferralBonusEnabled('yes')).toBe(false);
    expect(isReferralBonusEnabled('')).toBe(false);
  });

  it('is ON for "true" (case-insensitive, trimmed — matches repo env idiom)', () => {
    expect(isReferralBonusEnabled('true')).toBe(true);
    expect(isReferralBonusEnabled(' true ')).toBe(true);
    expect(isReferralBonusEnabled('TRUE')).toBe(true);
  });
});

describe('calculateReferralBonusPoints', () => {
  it('floors percent of the source cashback to a whole point', () => {
    // 10% of 265 = 26.5 -> 26
    expect(calculateReferralBonusPoints(265, 10)).toBe(26);
  });

  it('returns 0 when the percent is 0 (feature effectively disabled)', () => {
    expect(calculateReferralBonusPoints(1000, 0)).toBe(0);
  });

  it('returns 0 when the source cashback is 0', () => {
    expect(calculateReferralBonusPoints(0, 25)).toBe(0);
  });

  it('clamps percent above 100 down to 100 (never overpay past the source)', () => {
    expect(calculateReferralBonusPoints(200, 150)).toBe(200);
  });

  it('treats a negative percent as 0 rather than clawing back', () => {
    expect(calculateReferralBonusPoints(200, -10)).toBe(0);
  });

  it('rejects a non-finite or negative source amount (never pay on a reversal)', () => {
    expect(() => calculateReferralBonusPoints(-5, 10)).toThrow();
    expect(() => calculateReferralBonusPoints(Number.NaN, 10)).toThrow();
    expect(() => calculateReferralBonusPoints(Infinity, 10)).toThrow();
  });
});

describe('referralBonusPayoutKey', () => {
  it('derives a deterministic key namespaced off the referee source payout key', () => {
    expect(
      referralBonusPayoutKey('legacy:purchase:conversion:involve:44:default'),
    ).toBe(
      'referral:bonus:v1:source:legacy:purchase:conversion:involve:44:default',
    );
  });

  it('is stable across calls (same input -> same key)', () => {
    const a = referralBonusPayoutKey('legacy:purchase:conversion:x');
    const b = referralBonusPayoutKey('legacy:purchase:conversion:x');
    expect(a).toBe(b);
  });

  it('rejects an empty source payout key', () => {
    expect(() => referralBonusPayoutKey('')).toThrow();
    expect(() => referralBonusPayoutKey('   ')).toThrow();
  });
});

describe('REFERRAL_BONUS_ACTION', () => {
  it('is the ledger action string used for referral bonus Point rows', () => {
    expect(REFERRAL_BONUS_ACTION).toBe('referral_bonus');
  });
});
