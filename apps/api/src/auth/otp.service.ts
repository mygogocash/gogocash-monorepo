import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { InjectModel } from '@nestjs/mongoose';
import { UserOtp } from 'src/user/schemas/user-otp.schema';
import { Model } from 'mongoose';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  EmailOtpVerification,
  EmailOtpVerificationDocument,
} from './schemas/email-otp.schema';

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_MS = 30 * 60_000;

/**
 * Hash OTPs at rest. SHA-256 (no salt) is sufficient for short-lived 6-digit
 * codes paired with a per-email lockout. Preventing a database read (snapshot
 * leak, log dump) from yielding the literal OTP.
 *
 * NOTE: pending OTPs issued before this change become invalid on deploy.
 */
function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

@Injectable()
export class OtpService {
  // Two OTP subsystems coexist post-merge and DO NOT share state. Both now
  // deliver email via Resend (EmailService); they differ only in storage/flow:
  //  - UserOtp (legacy /send-otp, /verify-otp; hardened)
  //  - EmailOtpVerification + bcrypt (LINE-signup /email/request-otp, /email/verify-otp)
  constructor(
    private readonly emailService: EmailService,
    @InjectModel(UserOtp.name) private userOtpModel: Model<UserOtp>,
    @InjectModel(EmailOtpVerification.name)
    private otpModel: Model<EmailOtpVerificationDocument>,
  ) {}

  async sendOtpToEmail(email: string) {
    // Generate a 6-digit OTP with a CSPRNG (Math.random is not safe for
    // anything authentication-related). Reset the lockout counter on every
    // fresh request — issuing a new code starts a fresh attempt window.
    const otp = randomInt(100000, 1_000_000).toString();
    const userOtp = await this.userOtpModel.findOneAndUpdate(
      { email },
      { email, otp: hashOtp(otp), failed_attempts: 0, locked_until: null },
      { upsert: true, new: true },
    );
    if (userOtp) {
      await this.emailService.sendEmail({
        to: email,
        subject: 'Gogocash รหัสยืนยันการเข้าสู่ระบบ (OTP)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Gogocash</h2>
            <p>รหัสยืนยันการเข้าสู่ระบบ (OTP) ของคุณคือ:</p>
            <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 8px;">
              ${otp}
            </div>
            <p>รหัสนี้จะหมดอายุใน <strong>5 นาที</strong></p>
            <p style="color: #666;">หากคุณไม่ได้ร้องขอรหัสนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px;">GOGOCASH</p>
          </div>
        `,
        text: `รหัส OTP ของคุณคือ: ${otp}`,
      });
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtpAndCreateToken(email: string, userOtp: string) {
    const userOtpDoc = await this.userOtpModel.findOne({ email });

    if (!userOtpDoc) throw new UnauthorizedException('OTP not found');

    if (
      userOtpDoc.locked_until &&
      userOtpDoc.locked_until.getTime() > Date.now()
    ) {
      throw new HttpException(
        'Too many incorrect attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (timingSafeEqualHex(userOtpDoc.otp, hashOtp(userOtp))) {
      await this.userOtpModel.deleteOne({ email });
      return { message: 'OTP verified successfully', status: 'success' };
    }

    const nextAttempts = (userOtpDoc.failed_attempts ?? 0) + 1;
    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      await this.userOtpModel.updateOne(
        { email },
        {
          failed_attempts: nextAttempts,
          locked_until: new Date(Date.now() + LOCKOUT_MS),
        },
      );
      throw new HttpException(
        'Too many incorrect attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.userOtpModel.updateOne(
      { email },
      { failed_attempts: nextAttempts },
    );
    throw new UnauthorizedException('Invalid OTP');
  }

  /**
   * Find pending (unverified, non-expired) OTP record by email
   */
  private async findPendingOtp(
    email: string,
  ): Promise<EmailOtpVerificationDocument | null> {
    return this.otpModel
      .findOne({
        email,
        verified: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Upsert OTP record - one email = one record (single source of truth)
   * Uses findOneAndUpdate with upsert to ensure only ONE record per email
   */
  private async upsertOtp(data: {
    email: string;
    otpHash: string;
    expiresAt: Date;
  }): Promise<EmailOtpVerificationDocument> {
    try {
      const saved = await this.otpModel
        .findOneAndUpdate(
          { email: data.email }, // Find by email
          {
            $set: {
              otpHash: data.otpHash,
              expiresAt: data.expiresAt,
              attempts: 0, // Reset attempts on new OTP
              verified: false, // Reset verified status
            },
          },
          {
            upsert: true, // Create if doesn't exist
            new: true, // Return updated document
            setDefaultsOnInsert: true,
          },
        )
        .exec();

      return saved;
    } catch (error) {
      console.error(
        `[OtpService] ❌ Failed to upsert OTP for ${data.email}:`,
        error,
      );
      throw new Error(
        `Database upsert failed: ${(error as Error)?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Update failed verification attempts counter
   */
  private async updateOtpAttempts(id: string, attempts: number): Promise<void> {
    try {
      await this.otpModel.findByIdAndUpdate(id, { attempts }).exec();
    } catch (error) {
      console.error(
        `[OtpService] ❌ Failed to update OTP attempts for ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Mark OTP as verified (after successful verification)
   */
  private async markAsVerified(id: string): Promise<void> {
    try {
      await this.otpModel.findByIdAndUpdate(id, { verified: true }).exec();
    } catch (error) {
      console.error(
        `[OtpService] ❌ Failed to mark OTP as verified for ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // USE CASE LAYER (Public Methods - Business Logic)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Generate random 6-digit OTP code
   */
  private generateOtp(): string {
    // CSPRNG — Math.random is unsafe for auth codes (May hardening parity).
    return randomInt(100000, 1_000_000).toString();
  }

  /**
   * Create new OTP for email verification
   * Business Rules:
   * 1. Rate limiting: Max 1 OTP per 5 minutes per email
   * 2. Generate 6-digit random code
   * 3. Hash with bcrypt (security)
   * 4. Store with 5-minute expiration
   *
   * @param email - User's email address
   * @returns Plaintext OTP (to be sent via email)
   * @throws BadRequestException if rate limit exceeded
   */
  async createOtp(email: string): Promise<string> {
    // Business Rule 1: Rate limiting - check if pending OTP exists
    const existing = await this.findPendingOtp(email);
    if (existing) {
      const timeRemaining = Math.ceil(
        (existing.expiresAt.getTime() - Date.now()) / 1000 / 60,
      );
      throw new BadRequestException(
        `Please wait ${timeRemaining} minute(s) before requesting a new OTP`,
      );
    }

    // Business Rule 2: Generate 6-digit code
    const otp = this.generateOtp();

    // Business Rule 3: Hash OTP for security (never store plaintext)
    const otpHash = await bcrypt.hash(otp, 10);

    // Business Rule 4: Set expiration (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Repository call: Upsert to database (one email = one record)
    await this.upsertOtp({ email, otpHash, expiresAt });
    // Return plaintext OTP (will be sent via email)
    return otp;
  }

  /**
   * Verify OTP code against stored hash
   * Business Rules:
   * 1. Check OTP exists and not expired
   * 2. Check attempts < 5 (brute-force protection)
   * 3. Verify bcrypt hash matches
   * 4. Increment attempts on failure
   * 5. Mark as verified on success
   *
   * @param email - User's email address
   * @param otp - 6-digit OTP code from user
   * @returns true if valid, false if invalid
   * @throws BadRequestException if OTP expired/not found or max attempts exceeded
   */
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    // Repository call: Find pending OTP record
    const record = await this.findPendingOtp(email);

    // Business Rule 1: Check existence and expiration
    if (!record) {
      throw new BadRequestException(
        'OTP not found or expired. Please request a new one.',
      );
    }

    // Business Rule 2: Check max attempts (brute-force protection)
    if (record.attempts >= 5) {
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    // Business Rule 3: Verify OTP hash with bcrypt
    const isValid = await bcrypt.compare(otp, record.otpHash);

    if (!isValid) {
      // Increment failed attempts counter
      await this.updateOtpAttempts(record._id.toString(), record.attempts + 1);
      return false;
    }

    // Business Rule 4: Mark as verified on success
    await this.markAsVerified(record._id.toString());

    return true;
  }
}
