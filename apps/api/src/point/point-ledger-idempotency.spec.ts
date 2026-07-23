import { Types } from 'mongoose';
import {
  assertSamePointLedgerEffect,
  POINT_IDEMPOTENCY_KEY_CONFLICT,
} from './point-ledger-idempotency';

describe('assertSamePointLedgerEffect', () => {
  const userId = new Types.ObjectId();
  const refereeId = new Types.ObjectId();
  const expected = {
    user_id: userId,
    referral_id: refereeId,
    conversion_id: 44,
    point: 75,
    type: 'add',
    action: 'quest_task_v2',
    idempotency_key: 'quest:q1:task:t1:referrer:u1:referee:u2:epoch:0',
  };

  it('accepts the same semantic effect across ObjectId/string representations', () => {
    const existing = {
      ...expected,
      user_id: userId.toHexString(),
      referral_id: refereeId.toHexString(),
      conversion_id: '44',
      point: '75',
    };

    expect(assertSamePointLedgerEffect(existing, expected)).toBe(existing);
  });

  it.each([
    ['user_id', { user_id: new Types.ObjectId() }],
    ['referral_id', { referral_id: new Types.ObjectId() }],
    ['conversion_id', { conversion_id: 45 }],
    ['point', { point: 76 }],
    ['type', { type: 'remove' }],
    ['action', { action: 'referral' }],
    ['idempotency_key', { idempotency_key: 'different-key' }],
  ])('rejects a reused key with different %s semantics', (_field, patch) => {
    expect(() =>
      assertSamePointLedgerEffect({ ...expected, ...patch }, expected),
    ).toThrow(
      expect.objectContaining({
        status: 409,
        response: expect.objectContaining({
          code: POINT_IDEMPOTENCY_KEY_CONFLICT,
        }),
      }),
    );
  });
});
