import {
  applyWithdrawFeeCouponDiscount,
  normalizeWithdrawFeeCouponCode,
  resolveBaseWithdrawFee,
  resolveWithdrawFeePreview,
  type WithdrawFeeCouponLike,
  type WithdrawFeeRateLike,
} from './resolve-withdraw-fee';

describe('normalizeWithdrawFeeCouponCode', () => {
  it('normalizeWithdrawFeeCouponCode > given mixed case and spaces > then uppercases and trims', () => {
    expect(normalizeWithdrawFeeCouponCode('  goGo20  ')).toBe('GOGO20');
  });
});

describe('resolveBaseWithdrawFee', () => {
  const feeRate: WithdrawFeeRateLike = {
    fee_withdraw_thb: 20,
    fee_withdraw_usd: 1,
    minimum_withdraw_thb: 300,
    minimum_withdraw_usd: 10,
    global_withdraw_fee: 20,
    global_minimum_withdraw: 300,
    global_withdraw_currency: 'THB',
  };

  it('resolveBaseWithdrawFee > given THB > then uses fee_withdraw_thb and minimum_withdraw_thb', () => {
    expect(resolveBaseWithdrawFee(feeRate, 'THB')).toEqual({
      baseFee: 20,
      minWithdraw: 300,
      currency: 'THB',
    });
  });

  it('resolveBaseWithdrawFee > given USDT > then uses USD fee lane', () => {
    expect(resolveBaseWithdrawFee(feeRate, 'USDT')).toEqual({
      baseFee: 1,
      minWithdraw: 10,
      currency: 'USD',
    });
  });

  it('resolveBaseWithdrawFee > given a global fee without a global minimum > then keeps the currency minimum', () => {
    expect(
      resolveBaseWithdrawFee(
        {
          ...feeRate,
          global_minimum_withdraw: undefined,
        },
        'THB',
      ),
    ).toEqual({
      baseFee: 20,
      minWithdraw: 300,
      currency: 'THB',
    });
  });
});

describe('applyWithdrawFeeCouponDiscount', () => {
  const now = new Date('2026-07-18T00:00:00.000Z');

  function coupon(
    overrides: Partial<WithdrawFeeCouponLike> = {},
  ): WithdrawFeeCouponLike {
    return {
      _id: 'c1',
      code: 'SAVE10',
      name: 'Save 10',
      discount_mode: 'fixed',
      discount_value: 10,
      currency: 'THB',
      disabled: false,
      start_at: new Date('2026-01-01T00:00:00.000Z'),
      end_at: new Date('2026-12-31T00:00:00.000Z'),
      unlimited_quantity: true,
      quantity_used: 0,
      usage_per_user: 1,
      applies_to: ['bank_transfer'],
      ...overrides,
    };
  }

  it('applyWithdrawFeeCouponDiscount > given fixed discount > then subtracts value capped at base fee', () => {
    expect(
      applyWithdrawFeeCouponDiscount({
        baseFee: 20,
        currency: 'THB',
        method: 'bank_transfer',
        coupon: coupon({ discount_mode: 'fixed', discount_value: 10 }),
        userRedemptionCount: 0,
        now,
      }),
    ).toEqual({
      ok: true,
      discount: 10,
      finalFee: 10,
      couponCode: 'SAVE10',
      couponId: 'c1',
      couponName: 'Save 10',
    });
  });

  it('applyWithdrawFeeCouponDiscount > given fixed larger than fee > then caps discount at base fee', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 20,
      currency: 'THB',
      method: 'bank_transfer',
      coupon: coupon({ discount_mode: 'fixed', discount_value: 50 }),
      userRedemptionCount: 0,
      now,
    });
    expect(result).toMatchObject({ ok: true, discount: 20, finalFee: 0 });
  });

  it('applyWithdrawFeeCouponDiscount > given percent > then applies percent of fee', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 20,
      currency: 'THB',
      method: 'bank_transfer',
      coupon: coupon({ discount_mode: 'percent', discount_value: 50 }),
      userRedemptionCount: 0,
      now,
    });
    expect(result).toMatchObject({ ok: true, discount: 10, finalFee: 10 });
  });

  it('applyWithdrawFeeCouponDiscount > given waive > then zeroes fee', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 20,
      currency: 'THB',
      method: 'bank_transfer',
      coupon: coupon({ discount_mode: 'waive', discount_value: 0 }),
      userRedemptionCount: 0,
      now,
    });
    expect(result).toMatchObject({ ok: true, discount: 20, finalFee: 0 });
  });

  it('applyWithdrawFeeCouponDiscount > given disabled coupon > then rejects', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 20,
      currency: 'THB',
      method: 'bank_transfer',
      coupon: coupon({ disabled: true }),
      userRedemptionCount: 0,
      now,
    });
    expect(result).toEqual({ ok: false, reason: 'coupon_disabled' });
  });

  it('applyWithdrawFeeCouponDiscount > given expired window > then rejects', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 20,
      currency: 'THB',
      method: 'bank_transfer',
      coupon: coupon({
        end_at: new Date('2026-01-01T00:00:00.000Z'),
      }),
      userRedemptionCount: 0,
      now,
    });
    expect(result).toEqual({ ok: false, reason: 'coupon_expired' });
  });

  it('applyWithdrawFeeCouponDiscount > given exhausted quantity > then rejects', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 20,
      currency: 'THB',
      method: 'bank_transfer',
      coupon: coupon({
        unlimited_quantity: false,
        quantity: 5,
        quantity_used: 5,
      }),
      userRedemptionCount: 0,
      now,
    });
    expect(result).toEqual({ ok: false, reason: 'coupon_exhausted' });
  });

  it('applyWithdrawFeeCouponDiscount > given limited coupon without quantity > then rejects as exhausted', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 20,
      currency: 'THB',
      method: 'bank_transfer',
      coupon: coupon({
        unlimited_quantity: false,
        quantity: undefined,
        quantity_used: 0,
      }),
      userRedemptionCount: 0,
      now,
    });
    expect(result).toEqual({ ok: false, reason: 'coupon_exhausted' });
  });

  it('applyWithdrawFeeCouponDiscount > given usage_per_user reached > then rejects', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 20,
      currency: 'THB',
      method: 'bank_transfer',
      coupon: coupon({ usage_per_user: 1 }),
      userRedemptionCount: 1,
      now,
    });
    expect(result).toEqual({ ok: false, reason: 'coupon_user_limit' });
  });

  it('applyWithdrawFeeCouponDiscount > given currency mismatch > then rejects', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 1,
      currency: 'USD',
      method: 'bank_transfer',
      coupon: coupon({ currency: 'THB' }),
      userRedemptionCount: 0,
      now,
    });
    expect(result).toEqual({ ok: false, reason: 'coupon_currency_mismatch' });
  });

  it('applyWithdrawFeeCouponDiscount > given method not in applies_to > then rejects', () => {
    const result = applyWithdrawFeeCouponDiscount({
      baseFee: 20,
      currency: 'THB',
      method: 'on_chain',
      coupon: coupon({ applies_to: ['bank_transfer'] }),
      userRedemptionCount: 0,
      now,
    });
    expect(result).toEqual({ ok: false, reason: 'coupon_method_mismatch' });
  });
});

describe('resolveWithdrawFeePreview', () => {
  const feeRate: WithdrawFeeRateLike = {
    fee_withdraw_thb: 20,
    fee_withdraw_usd: 1,
    minimum_withdraw_thb: 300,
    minimum_withdraw_usd: 10,
  };

  it('resolveWithdrawFeePreview > given amount and balance > then computes receive and remaining cashback', () => {
    const result = resolveWithdrawFeePreview({
      feeRate,
      amount: 500,
      availableBalance: 1000,
      currency: 'THB',
      method: 'bank_transfer',
    });
    expect(result).toEqual({
      ok: true,
      available_balance: 1000,
      min_withdraw: 300,
      base_fee: 20,
      discount: 0,
      final_fee: 20,
      you_will_receive: 480,
      remaining_cashback: 500,
      currency: 'THB',
    });
  });

  it('resolveWithdrawFeePreview > given waive coupon > then zeroes fee in preview', () => {
    const result = resolveWithdrawFeePreview({
      feeRate,
      amount: 500,
      availableBalance: 1000,
      currency: 'THB',
      method: 'bank_transfer',
      coupon: {
        _id: 'c1',
        code: 'FREEFEE',
        name: 'Free fee',
        discount_mode: 'waive',
        discount_value: 0,
        currency: 'THB',
        disabled: false,
        start_at: new Date('2020-01-01T00:00:00.000Z'),
        end_at: new Date('2099-01-01T00:00:00.000Z'),
        unlimited_quantity: true,
        quantity_used: 0,
        usage_per_user: 1,
        applies_to: ['bank_transfer'],
      },
      userRedemptionCount: 0,
      now: new Date('2026-07-18T00:00:00.000Z'),
    });
    expect(result).toMatchObject({
      ok: true,
      base_fee: 20,
      discount: 20,
      final_fee: 0,
      you_will_receive: 500,
      remaining_cashback: 500,
      coupon: { code: 'FREEFEE', name: 'Free fee' },
    });
  });

  it('resolveWithdrawFeePreview > given amount below min > then rejects', () => {
    const result = resolveWithdrawFeePreview({
      feeRate,
      amount: 100,
      availableBalance: 1000,
      currency: 'THB',
      method: 'bank_transfer',
    });
    expect(result).toEqual({ ok: false, reason: 'below_minimum' });
  });

  it('resolveWithdrawFeePreview > given amount above balance > then rejects', () => {
    const result = resolveWithdrawFeePreview({
      feeRate,
      amount: 1500,
      availableBalance: 1000,
      currency: 'THB',
      method: 'bank_transfer',
    });
    expect(result).toEqual({ ok: false, reason: 'insufficient_balance' });
  });
});
