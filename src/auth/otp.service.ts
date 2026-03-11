import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  EmailOtpVerification,
  EmailOtpVerificationDocument,
} from './schemas/email-otp.schema';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(EmailOtpVerification.name)
    private otpModel: Model<EmailOtpVerificationDocument>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // REPOSITORY LAYER (Private Methods - Data Access Only)
  // ═══════════════════════════════════════════════════════════════════

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
      const saved = await this.otpModel.findOneAndUpdate(
        { email: data.email }, // Find by email
        {
          $set: {
            otpHash: data.otpHash,
            expiresAt: data.expiresAt,
            attempts: 0,        // Reset attempts on new OTP
            verified: false,    // Reset verified status
          },
        },
        {
          upsert: true,         // Create if doesn't exist
          new: true,            // Return updated document
          setDefaultsOnInsert: true,
        },
      ).exec();

      console.log(
        `[OtpService] ✅ OTP upserted for ${data.email} (ID: ${saved._id})`,
      );
      return saved;
    } catch (error) {
      console.error(
        `[OtpService] ❌ Failed to upsert OTP for ${data.email}:`,
        error,
      );
      throw new Error(
        `Database upsert failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Update failed verification attempts counter
   */
  private async updateOtpAttempts(id: string, attempts: number): Promise<void> {
    try {
      await this.otpModel.findByIdAndUpdate(id, { attempts }).exec();
      console.log(
        `[OtpService] Updated OTP attempts to ${attempts} for ID: ${id}`,
      );
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
      console.log(`[OtpService] ✅ OTP marked as verified for ID: ${id}`);
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
    return Math.floor(100000 + Math.random() * 900000).toString();
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

    console.log(`[OtpService] OTP created for ${email}: ${otp} (expires in 5 minutes)`);

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
      console.log(
        `Invalid OTP attempt for ${email}. Attempts: ${record.attempts + 1}/5`,
      );
      return false;
    }

    // Business Rule 4: Mark as verified on success
    await this.markAsVerified(record._id.toString());
    console.log(`OTP verified successfully for ${email}`);

    return true;
  }
}
