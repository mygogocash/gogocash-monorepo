import { PAYMENT_ATTEMPT_STATUSES } from './payment-attempt.schema';

describe('PaymentAttempt schema constants', () => {
  it('given PAYMENT_ATTEMPT_STATUSES > then it includes the commerce lifecycle states', () => {
    expect(PAYMENT_ATTEMPT_STATUSES).toEqual([
      'created',
      'pending',
      'succeeded',
      'failed',
      'expired',
      'refunded',
    ]);
  });
});
