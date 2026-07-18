import { model, models, Types } from 'mongoose';
import { Withdraw, WithdrawSchema } from './withdraw.schema';

describe('Withdraw schema money-evidence invariants', () => {
  const WithdrawModel =
    models.WithdrawSchemaContract ||
    model<Withdraw>('WithdrawSchemaContract', WithdrawSchema.clone());

  it('canonicalizes transaction hashes before persistence', () => {
    const withdraw = new WithdrawModel({
      amount_net: 10,
      amount_total: 10,
      conversion_id: [],
      currency: 'USD',
      method: 'on_chain',
      percent_fee: 0,
      status: 'pending',
      tx_hash: `0x${'AB'.repeat(32)}`,
      user_id: new Types.ObjectId(),
    });

    expect(withdraw.tx_hash).toBe(`0x${'ab'.repeat(32)}`);
  });

  it('declares case-insensitive unique payout evidence and partial command indexes', () => {
    const indexes = WithdrawSchema.indexes();
    const transactionHash = indexes.find(
      ([, options]) => options.name === 'uniq_withdraw_tx_hash_ci',
    );
    const command = indexes.find(
      ([, options]) => options.name === 'uniq_withdraw_user_idempotency_key',
    );

    expect(transactionHash).toEqual([
      { tx_hash: 1 },
      expect.objectContaining({
        unique: true,
        collation: { locale: 'en', strength: 2 },
        partialFilterExpression: {
          tx_hash: { $exists: true, $type: 'string', $gt: '' },
        },
      }),
    ]);
    expect(command).toEqual([
      { user_id: 1, idempotency_key: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: {
          idempotency_key: { $exists: true, $type: 'string', $gt: '' },
        },
      }),
    ]);
  });

  it('persists durable signature reservations and pre-mining broadcast evidence', () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const broadcastAt = new Date();
    const withdraw = new WithdrawModel({
      amount_net: 10,
      amount_total: 10,
      authorization_expires_at: expiresAt,
      chain_record_broadcast_at: broadcastAt,
      chain_record_broadcast_hash: `0x${'AB'.repeat(32)}`,
      conversion_id: [1],
      currency: 'USD',
      method: 'on_chain_signature',
      percent_fee: 0,
      status: 'pending',
      tx_hash: '',
      user_id: new Types.ObjectId(),
    });

    expect(withdraw.authorization_expires_at).toEqual(expiresAt);
    expect(withdraw.chain_record_broadcast_at).toEqual(broadcastAt);
    expect(withdraw.chain_record_broadcast_hash).toBe(`0x${'ab'.repeat(32)}`);
  });
});
