import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { EmailSuppressionService } from './email-suppression/email-suppression.service';
import type { SuppressionReason } from './customer-io.types';

/**
 * Inbound webhooks from Customer.io reporting email lifecycle events
 * (delivered, bounced, complained, unsubscribed, …). Bounce / complaint /
 * unsubscribe writes to the EmailSuppression collection so we never re-mail
 * a known-bad address.
 *
 * Configure in C.io:
 *   Settings → Webhooks → Reporting webhooks → POST {API_BASE}/webhooks/customer-io
 *   Subscribe to: Email Bounced, Email Spam Complaint, Email Unsubscribed,
 *                  (optionally) Email Dropped
 *   Signing secret → CUSTOMERIO_WEBHOOK_SECRET env var on this server
 */
@ApiTags('Webhooks')
@Controller('webhooks/customer-io')
export class CustomerIoController {
  private readonly logger = new Logger(CustomerIoController.name);

  constructor(private readonly suppression: EmailSuppressionService) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-cio-signature') signature: string | undefined,
    @Headers('x-cio-timestamp') timestamp: string | undefined,
  ): Promise<{ ok: true }> {
    const secret = process.env.CUSTOMERIO_WEBHOOK_SECRET;
    if (!secret) {
      // Refuse rather than process unverified webhooks. Configure the env
      // var or the endpoint stays closed.
      throw new UnauthorizedException(
        'CUSTOMERIO_WEBHOOK_SECRET not configured on this server',
      );
    }
    if (!signature || !timestamp || !req.rawBody) {
      throw new UnauthorizedException('Missing signature headers or body');
    }

    if (!this.verifySignature(secret, timestamp, req.rawBody, signature)) {
      throw new UnauthorizedException('Invalid signature');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(req.rawBody.toString('utf8'));
    } catch {
      throw new UnauthorizedException('Body is not valid JSON');
    }

    const reason = this.mapMetricToReason(parsed);
    if (!reason) {
      // Other metrics (delivered, opened, clicked) — we don't store these
      // here; PostHog already covers behavioural analytics. Acknowledge so
      // C.io stops retrying.
      return { ok: true };
    }

    const recipient: string | undefined =
      parsed?.data?.recipient ?? parsed?.data?.email_address;
    if (!recipient) {
      this.logger.warn(
        `Webhook ${reason} arrived without a recipient field — ignored`,
      );
      return { ok: true };
    }

    await this.suppression.add({
      email: recipient,
      reason,
      source: 'customer-io-webhook',
      note: typeof parsed?.metric === 'string' ? parsed.metric : reason,
    });

    return { ok: true };
  }

  /**
   * C.io signs each webhook with HMAC-SHA256 over `v0:{timestamp}:{rawBody}`,
   * sent in the `X-CIO-Signature` header as `v0=<hex>`. Reject anything else.
   * Constant-time compare prevents signature-recovery via response timing.
   */
  private verifySignature(
    secret: string,
    timestamp: string,
    rawBody: Buffer,
    signature: string,
  ): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`v0:${timestamp}:${rawBody.toString('utf8')}`)
      .digest('hex');
    const received = signature.startsWith('v0=')
      ? signature.slice(3)
      : signature;
    if (received.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(received, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * C.io reporting webhooks identify their event type via either
   * `metric` or `event_id`. Map the ones that should suppress.
   */
  private mapMetricToReason(payload: any): SuppressionReason | null {
    const metric = (payload?.metric ?? payload?.event_id ?? '').toString();
    switch (metric) {
      case 'email_bounced':
      case 'bounced':
        return 'bounced';
      case 'email_dropped':
      case 'dropped':
        return 'dropped';
      case 'email_spam_complaint':
      case 'spammed':
        return 'complained';
      case 'email_unsubscribed':
      case 'unsubscribed':
        return 'unsubscribed';
      default:
        return null;
    }
  }
}
