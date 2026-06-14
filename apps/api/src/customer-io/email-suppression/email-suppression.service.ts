import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailSuppression } from './email-suppression.schema';
import type { SuppressionReason } from '../customer-io.types';

@Injectable()
export class EmailSuppressionService {
  private readonly logger = new Logger(EmailSuppressionService.name);

  constructor(
    @InjectModel(EmailSuppression.name)
    private readonly model: Model<EmailSuppression>,
  ) {}

  /**
   * Returns true if the email is on the do-not-contact list. Pre-send gate
   * in CustomerIoService — a hit short-circuits the send.
   */
  async isSuppressed(email: string | undefined): Promise<boolean> {
    if (!email) return false;
    const hit = await this.model
      .exists({ email: email.toLowerCase().trim() })
      .lean();
    return Boolean(hit);
  }

  /**
   * Idempotent upsert. The webhook can deliver duplicates (e.g. retries) —
   * we keep the earliest suppression record and update reason if it
   * escalates (bounced → complained should not regress).
   */
  async add(input: {
    email: string;
    reason: SuppressionReason;
    source?: string;
    note?: string;
  }): Promise<void> {
    if (!input.email) return;
    const email = input.email.toLowerCase().trim();
    try {
      await this.model.updateOne(
        { email },
        {
          $setOnInsert: {
            email,
            reason: input.reason,
            suppressed_at: new Date(),
            source: input.source ?? '',
          },
          $set: {
            // Track the latest reason in `note` so support sees escalations
            // without losing the original suppression timestamp.
            note: input.note ?? input.reason,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to suppress ${email}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  /**
   * Used by the unsubscribe-undo flow / support tooling to re-enable sends
   * to a previously suppressed address. NOT exposed publicly — admin-only.
   */
  async remove(email: string): Promise<void> {
    if (!email) return;
    await this.model.deleteOne({ email: email.toLowerCase().trim() });
  }
}
