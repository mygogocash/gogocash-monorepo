import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RESEND_CLIENT, ResendLike } from './resend.provider';

const DEFAULT_FROM = 'GoGoCash <noreply@gogocash.co>';
const DELIVERY_UNAVAILABLE_MESSAGE =
  'Email delivery is temporarily unavailable. Please try again, or contact an administrator if it continues.';

/**
 * Outbound email via Resend (https://resend.com). Replaces the previous
 * Gmail/SMTP (nodemailer) and @nestjs-modules/mailer transports — one provider,
 * one verified sending domain (gogocash.co).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor(
    @Inject(RESEND_CLIENT) private readonly resend: ResendLike,
    config: ConfigService,
  ) {
    this.from = config.get<string>('env.MAIL_FROM') || DEFAULT_FROM;
  }

  /**
   * Send an email through Resend.
   * A send is successful only when Resend returns a provider message id. SDK
   * errors and missing acknowledgement are mapped to one safe, retryable 503;
   * provider details never enter the HTTP response.
   */
  async sendEmail(opts: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }): Promise<{ providerMessageId: string }> {
    let result: Awaited<ReturnType<ResendLike['emails']['send']>>;
    try {
      result = await this.resend.emails.send({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        attachments: opts.attachments,
      });
    } catch {
      // Do not log the thrown SDK object: provider errors may echo recipient
      // data. The public exception is intentionally stable and actionable.
      this.logger.error(
        'Email provider request failed before acknowledgement.',
      );
      throw new ServiceUnavailableException(DELIVERY_UNAVAILABLE_MESSAGE);
    }

    if (result.error) {
      this.logger.error('Email provider rejected an outbound message.');
      throw new ServiceUnavailableException(DELIVERY_UNAVAILABLE_MESSAGE);
    }

    const providerMessageId = result.data?.id?.trim();
    if (!providerMessageId) {
      this.logger.error(
        'Email provider returned without an acknowledgement message id.',
      );
      throw new ServiceUnavailableException(DELIVERY_UNAVAILABLE_MESSAGE);
    }

    return { providerMessageId };
  }

  /**
   * Send a verification OTP (English template). Used by the LINE-signup
   * email-OTP flow (POST /auth/email/request-otp).
   */
  async sendOtp(email: string, otp: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your GOGOCASH Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 8px;">
            ${otp}
          </div>
          <p>This code will expire in <strong>5 minutes</strong>.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #888; font-size: 12px;">GOGOCASH - Secure Verification</p>
        </div>
      `,
      text: `Your GOGOCASH verification code is ${otp}. It expires in 5 minutes.`,
    });
  }
}
