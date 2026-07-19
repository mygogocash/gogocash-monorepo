import { model, models } from 'mongoose';
import {
  WithdrawFeeCoupon,
  WithdrawFeeCouponSchema,
} from './withdraw-fee-coupon.schema';

describe('WithdrawFeeCoupon schema integer contract', () => {
  const CouponModel =
    models.WithdrawFeeCouponIntegerContract ||
    model<WithdrawFeeCoupon>(
      'WithdrawFeeCouponIntegerContract',
      WithdrawFeeCouponSchema.clone(),
    );

  const makeCoupon = (overrides: Record<string, unknown>) =>
    new CouponModel({
      code: 'SAVE10',
      name: 'Save ten',
      discount_mode: 'waive',
      discount_value: 0,
      currency: 'THB',
      start_at: new Date('2026-01-01T00:00:00.000Z'),
      end_at: new Date('2026-12-31T00:00:00.000Z'),
      ...overrides,
    });

  it.each(['quantity', 'usage_per_user'] as const)(
    'rejects a fractional %s even when validation is bypassed at the HTTP layer',
    async (property) => {
      const coupon = makeCoupon({
        unlimited_quantity: property === 'quantity' ? false : true,
        [property]: 1.5,
      });

      const error = await coupon.validate().catch((caught: unknown) => caught);
      expect(
        (error as { errors?: Record<string, unknown> }).errors?.[property],
      ).toBeDefined();
    },
  );
});
