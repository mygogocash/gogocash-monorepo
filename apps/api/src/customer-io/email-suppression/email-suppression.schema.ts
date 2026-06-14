import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { SuppressionReason } from '../customer-io.types';

export type EmailSuppressionDocument = HydratedDocument<EmailSuppression>;

/**
 * One row per email address that should not receive further sends. Populated
 * by the Customer.io webhook when bounces / complaints / unsubscribes happen.
 *
 * The pre-send check in CustomerIoService skips any send to an email that
 * has a row here. A user re-subscribing (e.g. via unsubscribe undo flow) is
 * an explicit `delete` of the row.
 */
@Schema({ timestamps: true })
export class EmailSuppression {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({
    type: String,
    enum: ['bounced', 'complained', 'unsubscribed', 'dropped'],
    required: true,
  })
  reason: SuppressionReason;

  @Prop({ type: Date, required: true, default: () => new Date() })
  suppressed_at: Date;

  /** Where the suppression came from — usually 'customer-io-webhook'. */
  @Prop({ required: false, default: '' })
  source: string;

  /** Optional free-form note (e.g. SMTP bounce code). */
  @Prop({ required: false, default: '' })
  note: string;
}

export const EmailSuppressionSchema =
  SchemaFactory.createForClass(EmailSuppression);
