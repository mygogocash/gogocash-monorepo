import {
  isAllowedWithdrawStatusTransition,
  shouldRestoreWithdrawFeeCoupon,
  type WithdrawAdminStatus,
} from './restore-withdraw-fee-coupon';

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

describe('isAllowedWithdrawStatusTransition', () => {
  it.each([
    ['pending', 'approved'],
    ['pending', 'rejected'],
    ['approved', 'rejected'],
    ['approved', 'paid'],
    ['rejected', 'rejected'],
  ])('allows %s -> %s', (previousStatus, nextStatus) => {
    expect(
      isAllowedWithdrawStatusTransition(
        previousStatus,
        nextStatus as WithdrawAdminStatus,
      ),
    ).toBe(true);
  });

  it.each([
    ['rejected', 'pending'],
    ['rejected', 'approved'],
    ['pending', 'paid'],
    ['paid', 'pending'],
    ['paid', 'rejected'],
  ])('rejects terminal transition %s -> %s', (previousStatus, nextStatus) => {
    expect(
      isAllowedWithdrawStatusTransition(
        previousStatus,
        nextStatus as WithdrawAdminStatus,
      ),
    ).toBe(false);
  });
});
