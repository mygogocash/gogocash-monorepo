import { buildFeeRateUpdate } from './fee-rate-update';

describe('buildFeeRateUpdate', () => {
  it('normalizes structured values and mirrors THB/USD legacy fields', () => {
    expect(
      buildFeeRateUpdate({
        system: 7,
        global_max_cap_mode: 'fixed',
        global_max_cap_amount: 500,
        global_max_cap_currency: 'thb',
        global_withdraw_fee: 25,
        global_minimum_withdraw: 100,
        global_withdraw_currency: 'thb',
        withdraw_regions: [
          {
            id: ' r-th ',
            countryCode: ' th ',
            currency: 'thb',
            feeWithdraw: 30,
            minimumWithdraw: 100,
            max_cap_mode: 'percent',
            max_cap_percent: 10,
            max_cap_amount: 0,
            max_cap_currency: 'thb',
          },
          {
            id: 'r-us',
            countryCode: 'US',
            currency: 'usd',
            feeWithdraw: 2,
            minimumWithdraw: 20,
          },
        ],
      }),
    ).toEqual({
      system: 7,
      global_max_cap_mode: 'fixed',
      global_max_cap_amount: 500,
      global_max_cap_currency: 'THB',
      global_withdraw_fee: 25,
      global_minimum_withdraw: 100,
      global_withdraw_currency: 'THB',
      withdraw_regions: [
        {
          id: 'r-th',
          countryCode: 'TH',
          currency: 'THB',
          feeWithdraw: 30,
          minimumWithdraw: 100,
          max_cap_mode: 'percent',
          max_cap_percent: 10,
          max_cap_amount: 0,
          max_cap_currency: 'THB',
        },
        {
          id: 'r-us',
          countryCode: 'US',
          currency: 'USD',
          feeWithdraw: 2,
          minimumWithdraw: 20,
          max_cap_mode: 'percent',
          max_cap_percent: 0,
          max_cap_amount: 0,
          max_cap_currency: 'USD',
        },
      ],
      fee_withdraw_thb: 30,
      minimum_withdraw_thb: 100,
      fee_withdraw_usd: 2,
      minimum_withdraw_usd: 20,
    });
  });

  it('preserves explicitly supplied legacy mirrors', () => {
    expect(
      buildFeeRateUpdate({
        fee_withdraw_thb: 99,
        minimum_withdraw_thb: 199,
        withdraw_regions: [
          {
            id: 'r-th',
            countryCode: 'TH',
            currency: 'THB',
            feeWithdraw: 30,
            minimumWithdraw: 100,
          },
        ],
      }),
    ).toMatchObject({
      fee_withdraw_thb: 99,
      minimum_withdraw_thb: 199,
    });
  });

  it('rejects duplicate markets and invalid cap values', () => {
    const region = {
      id: 'r-th',
      countryCode: 'TH',
      currency: 'THB',
      feeWithdraw: 30,
      minimumWithdraw: 100,
    };
    expect(() =>
      buildFeeRateUpdate({
        withdraw_regions: [region, { ...region, id: 'duplicate' }],
      }),
    ).toThrow(/duplicate fee region/i);
    expect(() => buildFeeRateUpdate({ global_max_cap_percent: 101 })).toThrow(
      /between 0 and 100/i,
    );
  });

  it('persists referral_bonus_percent within 0-100 (mirrors the system-fee clamp)', () => {
    expect(buildFeeRateUpdate({ referral_bonus_percent: 12 })).toEqual({
      referral_bonus_percent: 12,
    });
    expect(buildFeeRateUpdate({ referral_bonus_percent: 0 })).toEqual({
      referral_bonus_percent: 0,
    });
  });

  it('rejects a referral_bonus_percent outside 0-100 or non-finite', () => {
    expect(() =>
      buildFeeRateUpdate({ referral_bonus_percent: 101 }),
    ).toThrow(/between 0 and 100/i);
    expect(() =>
      buildFeeRateUpdate({ referral_bonus_percent: -1 }),
    ).toThrow(/zero or greater/i);
    expect(() =>
      buildFeeRateUpdate({ referral_bonus_percent: Number.NaN }),
    ).toThrow();
  });

  it('omits referral_bonus_percent from the update when not supplied', () => {
    expect(buildFeeRateUpdate({ system: 5 })).toEqual({ system: 5 });
  });
});
