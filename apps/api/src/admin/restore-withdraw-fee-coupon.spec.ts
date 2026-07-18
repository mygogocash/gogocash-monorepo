import { shouldRestoreWithdrawFeeCoupon } from './restore-withdraw-fee-coupon';

describe('shouldRestoreWithdrawFeeCoupon', () => {
  it('shouldRestoreWithdrawFeeCoupon > given pending to rejected with coupon > then true', () => {
    expect(
      shouldRestoreWithdrawFeeCoupon({
        previousStatus: 'pending',
        nextStatus: 'rejected',
        couponId: 'abc',
      }),
    ).toBe(true);
  });

  it('shouldRestoreWithdrawFeeCoupon > given already rejected > then false', () => {
    expect(
      shouldRestoreWithdrawFeeCoupon({
        previousStatus: 'rejected',
        nextStatus: 'rejected',
        couponId: 'abc',
      }),
    ).toBe(false);
  });

  it('shouldRestoreWithdrawFeeCoupon > given reject without coupon > then false', () => {
    expect(
      shouldRestoreWithdrawFeeCoupon({
        previousStatus: 'pending',
        nextStatus: 'rejected',
        couponId: undefined,
      }),
    ).toBe(false);
  });

  it('shouldRestoreWithdrawFeeCoupon > given approve > then false', () => {
    expect(
      shouldRestoreWithdrawFeeCoupon({
        previousStatus: 'pending',
        nextStatus: 'approved',
        couponId: 'abc',
      }),
    ).toBe(false);
  });
});
