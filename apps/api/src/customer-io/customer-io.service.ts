import { Injectable, Logger } from '@nestjs/common';
import {
  APIClient as CioAPIClient,
  SendEmailRequest,
  TrackClient,
} from 'customerio-node';
import { CIO_TRAITS, CioEventName, resolveRegion } from './customer-io.types';
import { EmailSuppressionService } from './email-suppression/email-suppression.service';

type Traits = Record<string, unknown>;
type EventProperties = Record<string, unknown>;

/**
 * Flexible user shape — accepts both Mongoose documents and plain DTOs. We
 * don't import the User schema directly to keep this module loosely coupled
 * (so it can be reused elsewhere without dragging Mongoose deps in).
 */
type UserLike = {
  _id: { toString(): string } | string;
  email?: string;
  mobile?: string;
  country?: string;
  provider?: string;
  privilege?: string;
  createdAt?: Date | string;
  username?: string;
  birthdate?: string;
};

/**
 * Wraps the customerio-node SDK in the same shape as the existing
 * `AnalyticsService` (PostHog wrapper). Null-safe: if `CUSTOMERIO_SITE_ID`
 * is unset the service no-ops. Every method is fire-and-forget — failures
 * log a warning, never throw, never block the calling business action.
 *
 * Identify and track go through the Track API (siteId + trackKey).
 * Transactional sends go through the App API (appKey).
 */
@Injectable()
export class CustomerIoService {
  private readonly logger = new Logger(CustomerIoService.name);

  private readonly enabled = Boolean(
    process.env.CUSTOMERIO_SITE_ID && process.env.CUSTOMERIO_TRACK_API_KEY,
  );

  private readonly trackClient = this.enabled
    ? new TrackClient(
        process.env.CUSTOMERIO_SITE_ID!,
        process.env.CUSTOMERIO_TRACK_API_KEY!,
        { region: resolveRegion() },
      )
    : null;

  private readonly apiClient = process.env.CUSTOMERIO_APP_API_KEY
    ? new CioAPIClient(process.env.CUSTOMERIO_APP_API_KEY, {
        region: resolveRegion(),
      })
    : null;

  constructor(private readonly suppression: EmailSuppressionService) {
    if (!this.enabled) {
      this.logger.warn(
        'Customer.io disabled — set CUSTOMERIO_SITE_ID and CUSTOMERIO_TRACK_API_KEY to enable',
      );
    }
  }

  /**
   * Sync user attributes to the C.io profile. Marketing's segmentation
   * reads these. Safe to call on every login — C.io upserts.
   */
  async identify(user: UserLike, extras: Traits = {}): Promise<void> {
    if (!this.trackClient) return;
    const id = String(user._id);
    if (!id) return;

    try {
      await this.trackClient.identify(id, this.buildTraits(user, extras));
    } catch (error) {
      this.logger.warn(
        `identify(${id}) failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  /**
   * Fire a behavioural event. Journey triggers in the C.io dashboard read
   * these. Properties are merged into the journey's Liquid context.
   */
  async track(
    userId: string | { toString(): string },
    event: CioEventName,
    properties: EventProperties = {},
  ): Promise<void> {
    if (!this.trackClient) return;
    const id = String(userId);
    if (!id) return;

    try {
      await this.trackClient.track(id, {
        name: event,
        data: this.compactProps(properties),
      });
    } catch (error) {
      this.logger.warn(
        `track(${event}, ${id}) failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  /**
   * One-shot transactional email. `transactionalMessageId` is the numeric
   * ID from C.io's transactional template UI. `messageData` is merged into
   * the template's Liquid context. Suppression list is checked first.
   */
  async sendTransactional(opts: {
    transactionalMessageId: string;
    to: string;
    identifierId: string | { toString(): string };
    messageData?: Record<string, unknown>;
  }): Promise<{ sent: boolean; reason?: string }> {
    if (!this.apiClient) {
      this.logger.warn(
        'sendTransactional skipped — CUSTOMERIO_APP_API_KEY missing',
      );
      return { sent: false, reason: 'app_api_key_missing' };
    }
    if (!opts.transactionalMessageId) {
      return { sent: false, reason: 'template_id_missing' };
    }

    if (await this.suppression.isSuppressed(opts.to)) {
      this.logger.log(`sendTransactional skipped — ${opts.to} suppressed`);
      return { sent: false, reason: 'suppressed' };
    }

    try {
      const request = new SendEmailRequest({
        to: opts.to,
        identifiers: { id: String(opts.identifierId) },
        transactional_message_id: opts.transactionalMessageId,
        message_data: opts.messageData ?? {},
      });
      await this.apiClient.sendEmail(request);
      return { sent: true };
    } catch (error) {
      this.logger.warn(
        `sendTransactional(template=${opts.transactionalMessageId}, to=${opts.to}) failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return {
        sent: false,
        reason: error instanceof Error ? error.message : 'unknown',
      };
    }
  }

  /**
   * Delete the user's profile from C.io. Wire this into the PDPA Section 30
   * right-to-erasure flow alongside any other PII purges. Safe to call for
   * profiles that don't exist.
   */
  async delete(userId: string | { toString(): string }): Promise<void> {
    if (!this.trackClient) return;
    const id = String(userId);
    if (!id) return;

    try {
      await this.trackClient.destroy(id);
    } catch (error) {
      this.logger.warn(
        `delete(${id}) failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  /**
   * Build the trait payload sent on identify. Maps internal field names
   * (id_firebase, etc.) to the C.io trait dictionary in customer-io.types.ts.
   * Strips undefined values so we don't blow away existing traits with
   * blanks — C.io merges, doesn't replace.
   */
  private buildTraits(user: UserLike, extras: Traits): Traits {
    const base: Traits = {
      [CIO_TRAITS.email]: user.email || undefined,
      [CIO_TRAITS.mobile]: user.mobile || undefined,
      [CIO_TRAITS.country]: user.country || undefined,
      [CIO_TRAITS.provider]: user.provider || undefined,
      [CIO_TRAITS.created_at]: this.toUnixSeconds(user.createdAt),
      [CIO_TRAITS.membership_tier]: user.privilege || undefined,
    };
    return this.compactProps({ ...base, ...extras });
  }

  /** C.io expects `created_at` as a Unix timestamp in seconds, not ISO. */
  private toUnixSeconds(value: Date | string | undefined): number | undefined {
    if (!value) return undefined;
    const d = typeof value === 'string' ? new Date(value) : value;
    const t = d.getTime();
    return Number.isFinite(t) ? Math.floor(t / 1000) : undefined;
  }

  /** Drop undefined / null / empty-string properties before sending. */
  private compactProps(input: Traits): Traits {
    const out: Traits = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null || v === '') continue;
      out[k] = v;
    }
    return out;
  }
}
