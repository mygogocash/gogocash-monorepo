import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    // Initialize Nodemailer with Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get<string>('env.GMAIL_USER'),
        pass: this.config.get<string>('env.GMAIL_APP_PASSWORD'),
      },
    });
  }

  /**
   * Send OTP code via email
   * @param email - Recipient email address
   * @param otp - 6-digit OTP code
   * @throws Error if email sending fails (propagates to controller)
   */
  async sendOtp(email: string, otp: string): Promise<void> {
    console.log(`[EmailService] Sending OTP to ${email}`);

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('env.GMAIL_USER'),
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
      });

      console.log(`[EmailService] ✅ OTP email sent successfully to ${email}`);
    } catch (error) {
      console.error(
        `[EmailService] ❌ Failed to send OTP email to ${email}:`,
        error,
      );
      // Re-throw with context for upper layers
      throw new Error(
        `Email delivery failed: ${error?.message || 'SMTP connection error'}`,
      );
    }
  }
}
