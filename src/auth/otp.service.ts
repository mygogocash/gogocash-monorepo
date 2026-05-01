import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { UserOtp } from 'src/user/schemas/user-otp.schema';
import { Model } from 'mongoose';
import { createHash, randomInt, timingSafeEqual } from 'crypto';

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_MS = 30 * 60_000;

/**
 * Hash OTPs at rest. SHA-256 (no salt) is sufficient for short-lived 6-digit
 * codes paired with a per-email lockout — bcrypt's slow KDF is overkill given
 * the lockout caps online attempts at 3. The point is preventing a database
 * read (snapshot leak, accidental log dump) from yielding the literal OTP.
 *
 * NOTE: pending OTPs issued before this change become invalid on deploy
 * (their stored value is plaintext, this hashes the input before compare).
 * Affected users simply request a new code.
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
  constructor(
    private readonly mailerService: MailerService,
    @InjectModel(UserOtp.name) private userOtpModel: Model<UserOtp>,
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
      await this.mailerService.sendMail({
        from: 'Gogocash <support@gogocash.co>',
        to: email,
        subject: 'Gogocash รหัสยืนยันการเข้าสู่ระบบ (OTP)',
        template: './otp',
        context: { otp },
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
}
