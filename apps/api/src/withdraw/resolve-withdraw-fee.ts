export type WithdrawFeeDiscountMode = 'fixed' | 'percent' | 'waive';

export type WithdrawFeeRateLike = {
  fee_withdraw_thb?: number;
  fee_withdraw_usd?: number;
  minimum_withdraw_thb?: number;
  minimum_withdraw_usd?: number;
  global_withdraw_fee?: number;
  global_minimum_withdraw?: number;
  global_withdraw_currency?: string;
};

export type WithdrawFeeCouponLike = {
  _id: string;
  code: string;
  name: string;
  discount_mode: WithdrawFeeDiscountMode;
  discount_value: number;
  currency: string;
  disabled: boolean;
  start_at: Date;
  end_at: Date;
  quantity?: number;
  quantity_used: number;
  unlimited_quantity: boolean;
  usage_per_user: number;
  applies_to: string[];
  min_withdraw_amount?: number;
};

export type CouponDiscountFailureReason =
  | 'coupon_disabled'
  | 'coupon_not_started'
  | 'coupon_expired'
  | 'coupon_exhausted'
  | 'coupon_user_limit'
  | 'coupon_currency_mismatch'
  | 'coupon_method_mismatch';

export type CouponDiscountResult =
  | {
      ok: true;
      discount: number;
      finalFee: number;
      couponCode: string;
      couponId: string;
      couponName: string;
    }
  | { ok: false; reason: CouponDiscountFailureReason };

export type PreviewFailureReason =
  | 'below_minimum'
  | 'insufficient_balance'
  | 'negative_receive'
  | CouponDiscountFailureReason;

export type WithdrawFeePreviewResult =
  | {
      ok: true;
      available_balance: number;
      min_withdraw: number;
      base_fee: number;
      discount: number;
      final_fee: number;
      you_will_receive: number;
      remaining_cashback: number;
      currency: string;
      coupon?: { code: string; name: string; id: string };
    }
  | { ok: false; reason: PreviewFailureReason };

function asNonNegativeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return n;
}

export function normalizeWithdrawFeeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function resolveBaseWithdrawFee(
  feeRate: WithdrawFeeRateLike,
  currency: string,
): { baseFee: number; minWithdraw: number; currency: string } {
  const normalized = currency.toUpperCase();
  const usesThbLane = normalized === 'THB';
  const feeCurrency = usesThbLane ? 'THB' : 'USD';

  const globalCurrency = (
    feeRate.global_withdraw_currency || 'THB'
  ).toUpperCase();
  const useGlobal =
    typeof feeRate.global_withdraw_fee === 'number' &&
    globalCurrency === feeCurrency;

  if (usesThbLane) {
    return {
      baseFee: useGlobal
        ? asNonNegativeNumber(feeRate.global_withdraw_fee)
        : asNonNegativeNumber(feeRate.fee_withdraw_thb),
      minWithdraw: useGlobal
        ? asNonNegativeNumber(
            feeRate.global_minimum_withdraw,
            asNonNegativeNumber(feeRate.minimum_withdraw_thb),
          )
        : asNonNegativeNumber(feeRate.minimum_withdraw_thb),
      currency: 'THB',
    };
  }

  return {
    baseFee: useGlobal
      ? asNonNegativeNumber(feeRate.global_withdraw_fee)
      : asNonNegativeNumber(feeRate.fee_withdraw_usd),
    minWithdraw: useGlobal
      ? asNonNegativeNumber(
          feeRate.global_minimum_withdraw,
          asNonNegativeNumber(feeRate.minimum_withdraw_usd),
        )
      : asNonNegativeNumber(feeRate.minimum_withdraw_usd),
    currency: 'USD',
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function applyWithdrawFeeCouponDiscount(input: {
  baseFee: number;
  currency: string;
  method: string;
  coupon: WithdrawFeeCouponLike;
  userRedemptionCount: number;
  now?: Date;
}): CouponDiscountResult {
  const now = input.now ?? new Date();
  const coupon = input.coupon;

  if (coupon.disabled) {
    return { ok: false, reason: 'coupon_disabled' };
  }
  if (now < coupon.start_at) {
    return { ok: false, reason: 'coupon_not_started' };
  }
  if (now > coupon.end_at) {
    return { ok: false, reason: 'coupon_expired' };
  }
  if (
    !coupon.unlimited_quantity &&
    typeof coupon.quantity === 'number' &&
    coupon.quantity_used >= coupon.quantity
  ) {
    return { ok: false, reason: 'coupon_exhausted' };
  }
  if (input.userRedemptionCount >= coupon.usage_per_user) {
    return { ok: false, reason: 'coupon_user_limit' };
  }
  if (coupon.currency.toUpperCase() !== input.currency.toUpperCase()) {
    return { ok: false, reason: 'coupon_currency_mismatch' };
  }
  if (!coupon.applies_to.includes(input.method)) {
    return { ok: false, reason: 'coupon_method_mismatch' };
  }

  let discount = 0;
  switch (coupon.discount_mode) {
    case 'fixed':
      discount = asNonNegativeNumber(coupon.discount_value);
      break;
    case 'percent':
      discount =
        (input.baseFee * asNonNegativeNumber(coupon.discount_value)) / 100;
      break;
    case 'waive':
      discount = input.baseFee;
      break;
    default: {
      const _exhaustive: never = coupon.discount_mode;
      return _exhaustive;
    }
  }

  discount = roundMoney(Math.min(discount, input.baseFee));
  const finalFee = roundMoney(Math.max(0, input.baseFee - discount));

  return {
    ok: true,
    discount,
    finalFee,
    couponCode: normalizeWithdrawFeeCouponCode(coupon.code),
    couponId: String(coupon._id),
    couponName: coupon.name,
  };
}

export function resolveWithdrawFeePreview(input: {
  feeRate: WithdrawFeeRateLike;
  amount: number;
  availableBalance: number;
  currency: string;
  method: string;
  coupon?: WithdrawFeeCouponLike | null;
  userRedemptionCount?: number;
  now?: Date;
}): WithdrawFeePreviewResult {
  const amount = asNonNegativeNumber(input.amount);
  const availableBalance = asNonNegativeNumber(input.availableBalance);
  const base = resolveBaseWithdrawFee(input.feeRate, input.currency);

  let minWithdraw = base.minWithdraw;
  if (
    input.coupon &&
    typeof input.coupon.min_withdraw_amount === 'number' &&
    input.coupon.min_withdraw_amount > minWithdraw
  ) {
    minWithdraw = input.coupon.min_withdraw_amount;
  }

  if (amount < minWithdraw) {
    return { ok: false, reason: 'below_minimum' };
  }
  if (amount > availableBalance) {
    return { ok: false, reason: 'insufficient_balance' };
  }

  let discount = 0;
  let finalFee = base.baseFee;
  let couponMeta: { code: string; name: string; id: string } | undefined;

  if (input.coupon) {
    const applied = applyWithdrawFeeCouponDiscount({
      baseFee: base.baseFee,
      currency: base.currency,
      method: input.method,
      coupon: input.coupon,
      userRedemptionCount: input.userRedemptionCount ?? 0,
      now: input.now,
    });
    if (applied.ok === false) {
      return { ok: false, reason: applied.reason };
    }
    discount = applied.discount;
    finalFee = applied.finalFee;
    couponMeta = {
      code: applied.couponCode,
      name: applied.couponName,
      id: applied.couponId,
    };
  }

  const youWillReceive = roundMoney(amount - finalFee);
  if (youWillReceive < 0) {
    return { ok: false, reason: 'negative_receive' };
  }

  return {
    ok: true,
    available_balance: availableBalance,
    min_withdraw: minWithdraw,
    base_fee: base.baseFee,
    discount,
    final_fee: finalFee,
    you_will_receive: youWillReceive,
    remaining_cashback: roundMoney(availableBalance - amount),
    currency: base.currency,
    ...(couponMeta ? { coupon: couponMeta } : {}),
  };
}
