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

  @Prop()
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

  @Prop({ required: false })
  rate: number;

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
}

export const WithdrawSchema = SchemaFactory.createForClass(Withdraw);

/** Supports the admin "Pending manual" filter in O(log n). */
WithdrawSchema.index({ withdraw_mode: 1, status: 1 });

/**
 * Enforces uniqueness of on-chain tx hashes **only when populated**. Legacy
 * rows (and any manual request still in `pending`) keep `tx_hash: ''` which
 * the partial filter excludes, so the index doesn't reject empties.
 */
WithdrawSchema.index(
  { tx_hash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      tx_hash: { $exists: true, $type: 'string', $gt: '' },
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
