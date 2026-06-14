import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RESEND_CLIENT, ResendLike } from './resend.provider';

const DEFAULT_FROM = 'GoGoCash <noreply@gogocash.co>';

/**
 * Outbound email via Resend (https://resend.com). Replaces the previous
 * Gmail/SMTP (nodemailer) and @nestjs-modules/mailer transports — one provider,
 * one verified sending domain (gogocash.co).
 */
@Injectable()
export class EmailService {
  private readonly from: string;

  constructor(
    @Inject(RESEND_CLIENT) private readonly resend: ResendLike,
    config: ConfigService,
  ) {
    this.from = config.get<string>('env.MAIL_FROM') || DEFAULT_FROM;
  }

  /**
   * Send an email through Resend.
   * @throws Error if Resend reports a delivery error (never swallowed —
   *   the OTP controllers depend on this to surface failures to the caller).
   */
  async sendEmail(opts: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (error) {
      throw new Error(`Email delivery failed: ${error.message}`);
    }
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
