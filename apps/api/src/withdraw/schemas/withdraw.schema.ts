import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WithdrawDocument = HydratedDocument<Withdraw>;

@Schema({ timestamps: true })
export class Withdraw {
  @Prop({ required: false, unique: false })
  address: string;

  @Prop({ required: false })
  account_number: string;

  @Prop({ required: false })
  account_name: string;

  @Prop({ required: false })
  bank_name: string;

  @Prop({ required: true })
  amount_total: number;

  @Prop({ required: true })
  amount_net: number;

  @Prop({ required: true, type: Number })
  percent_fee: number;

  @Prop({ required: true })
  status: string; // pending, completed, rejected

  @Prop({ required: true })
  method: string; // metamask, coinbase, bank etc.

  @Prop({ lowercase: true, trim: true })
  tx_hash: string;

  @Prop()
  tx_hash_record: string;

  @Prop({ required: true, ref: 'User', type: Types.ObjectId })
  user_id: Types.ObjectId;

  @Prop({ required: true, type: [Number] })
  conversion_id: number[];

  @Prop({ required: true })
  currency: string; // USDC, ETH, BTC etc.

  @Prop({ required: false })
  slip_file: string;

  @Prop({ required: false, ref: 'UserMyCashback', type: [Types.ObjectId] })
  mycashback_id: Types.ObjectId[];

  /** Primary withdrawal that owns this internal MyCashback companion row. */
  @Prop({ required: false, ref: 'Withdraw', type: Types.ObjectId })
  parent_withdraw_id?: Types.ObjectId;

  @Prop({ required: false })
  rate: number;

  /** Customer command identity for safe HTTP retry of bank withdrawals. */
  @Prop({ required: false, trim: true, maxlength: 128 })
  idempotency_key?: string;

  /** Stable hash of the money effect bound to idempotency_key. */
  @Prop({ required: false, trim: true, lowercase: true, maxlength: 64 })
  idempotency_effect_hash?: string;

  /** Durable state machine for the post-reservation chain-record outbox. */
  @Prop({
    required: false,
    enum: ['reserved', 'processing', 'broadcast', 'recorded', 'failed'],
  })
  chain_record_state?:
    'reserved' | 'processing' | 'broadcast' | 'recorded' | 'failed';

  @Prop({ required: false, type: Number, min: 1 })
  chain_record_chain_id?: number;

  @Prop({ required: false, type: Date })
  chain_record_lease_until?: Date;

  @Prop({ required: false, trim: true, maxlength: 64 })
  chain_record_lease_owner?: string;

  @Prop({ required: false, type: Date })
  chain_record_confirmed_at?: Date;

  /** Transaction evidence captured immediately after broadcast, before mining. */
  @Prop({
    required: false,
    lowercase: true,
    trim: true,
    maxlength: 66,
    match: /^0x[0-9a-f]{64}$/,
  })
  chain_record_broadcast_hash?: string;

  @Prop({ required: false, type: Date })
  chain_record_broadcast_at?: Date;

  @Prop({ required: false, type: Number, min: 0, default: 0 })
  chain_record_attempts?: number;

  @Prop({ type: Boolean, default: false })
  flagged: boolean;

  @Prop({ type: String, required: false })
  flag_reason: string;

  /**
   * `"auto"` (default) — user signed an on-chain tx themselves; `tx_hash` is
   * populated immediately. `"manual"` — user submitted a request from a
   * custodial context (e.g. MiniPay); admin sends the payout externally and
   * records the tx hash via `PATCH /admin/withdraw/:id/mark-paid`.
   *
   * Default `"auto"` keeps every pre-existing withdraw record valid without a
   * backfill migration.
   */
  @Prop({ type: String, enum: ['auto', 'manual'], default: 'auto' })
  withdraw_mode: 'auto' | 'manual';

  /**
   * Which chain the payout is on. Populated for manual requests
   * (currently always `"CELO"` for MiniPay). Left optional so the existing
   * auto flow is unchanged.
   */
  @Prop({ type: String, required: false })
  chain: string;

  /**
   * Expiry of a spendable EIP-712 withdrawal authorization. Signature rows
   * remain balance reservations until their post-expiry chain reconciliation
   * proves that the authorization was unused.
   */
  @Prop({ type: Date, required: false })
  authorization_expires_at?: Date;

  @Prop({
    type: String,
    required: false,
    enum: [
      'issued',
      'expired_unverified',
      'submitted',
      'executed_unclaimed',
      'released',
    ],
  })
  authorization_state?:
    | 'issued'
    | 'expired_unverified'
    | 'submitted'
    | 'executed_unclaimed'
    | 'released';

  @Prop({ type: String, required: false, lowercase: true, trim: true })
  authorization_request_hash?: string;

  @Prop({ type: String, required: false, trim: true })
  authorization_signature?: string;

  @Prop({ type: String, required: false, trim: true })
  authorization_amount_atomic?: string;

  @Prop({ type: String, required: false, lowercase: true, trim: true })
  authorization_conversion_hash?: string;

  @Prop({ type: Number, required: false, min: 1 })
  authorization_chain_id?: number;

  @Prop({ type: String, required: false, lowercase: true, trim: true })
  authorization_contract?: string;

  @Prop({ type: Boolean, required: false })
  authorization_slot_active?: boolean;

  /** Admin user id who marked the manual request paid. */
  @Prop({ type: String, required: false })
  paid_by: string;

  @Prop({ type: Date, required: false })
  paid_at: Date;

  /**
   * Admin user id who approved a pending withdrawal (V-2b). On-chain withdrawals
   * are now created as `pending` and an admin confirms the on-chain settlement
   * here, instead of the client self-approving via a tx_hash.
   */
  @Prop({ type: String, required: false })
  approved_by: string;

  @Prop({ type: Date, required: false })
  approved_at: Date;

  /** Flat withdraw fee before coupon discount (server-computed). */
  @Prop({ type: Number, required: false, min: 0 })
  withdraw_fee_base?: number;

  @Prop({ type: Number, required: false, min: 0 })
  withdraw_fee_discount?: number;

  @Prop({ type: Number, required: false, min: 0 })
  withdraw_fee_final?: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'WithdrawFeeCoupon',
    required: false,
  })
  coupon_id?: Types.ObjectId;

  @Prop({ type: String, required: false, uppercase: true, trim: true })
  coupon_code?: string;
}

export const WithdrawSchema = SchemaFactory.createForClass(Withdraw);

/** Supports the admin "Pending manual" filter in O(log n). */
WithdrawSchema.index({ withdraw_mode: 1, status: 1 });
WithdrawSchema.index({ parent_withdraw_id: 1, status: 1 });
WithdrawSchema.index({ chain_record_state: 1, chain_record_lease_until: 1 });
WithdrawSchema.index({
  user_id: 1,
  method: 1,
  status: 1,
  authorization_expires_at: 1,
});
WithdrawSchema.index(
  { user_id: 1 },
  {
    name: 'uniq_active_withdraw_authorization_per_user',
    unique: true,
    partialFilterExpression: { authorization_slot_active: true },
  },
);
WithdrawSchema.index(
  { user_id: 1, authorization_request_hash: 1 },
  {
    name: 'uniq_withdraw_authorization_request',
    unique: true,
    partialFilterExpression: {
      authorization_request_hash: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);
WithdrawSchema.index(
  { chain_record_chain_id: 1, chain_record_broadcast_hash: 1 },
  {
    name: 'uniq_withdraw_chain_broadcast_hash',
    unique: true,
    partialFilterExpression: {
      chain_record_chain_id: { $exists: true, $type: 'number' },
      chain_record_broadcast_hash: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);

/**
 * Enforces uniqueness of on-chain tx hashes **only when populated**. Legacy
 * rows (and any manual request still in `pending`) keep `tx_hash: ''` which
 * the partial filter excludes, so the index doesn't reject empties.
 */
WithdrawSchema.index(
  { tx_hash: 1 },
  {
    name: 'uniq_withdraw_tx_hash_ci',
    unique: true,
    collation: { locale: 'en', strength: 2 },
    partialFilterExpression: {
      tx_hash: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);

/** One durable bank-withdraw command per customer key. */
WithdrawSchema.index(
  { user_id: 1, idempotency_key: 1 },
  {
    name: 'uniq_withdraw_user_idempotency_key',
    unique: true,
    partialFilterExpression: {
      idempotency_key: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);

/**
 * Guarantees at most one `pending` manual request per user at the DB layer,
 * closing the check-then-create race in `createManualWithdrawRequest`. The
 * partial filter means rows in other states (paid/rejected/approved) don't
 * collide and only manual-mode rows are constrained.
 */
WithdrawSchema.index(
  { user_id: 1, withdraw_mode: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      withdraw_mode: 'manual',
      status: 'pending',
    },
  },
);
