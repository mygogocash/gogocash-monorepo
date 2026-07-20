import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { EmailService } from 'src/email/email.service';
import { User } from 'src/user/schemas/user.schema';
import { requireObjectId } from 'src/common/mongo-query';
import {
  UserContactOtp,
  UserContactOtpDocument,
} from './schemas/user-contact-otp.schema';
import type {
  SendUserContactOtpDto,
  UpdateWithdrawUserDto,
  VerifyUserContactOtpDto,
} from './dto/user-contact-otp.dto';

const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function normalizeTarget(
  channel: 'email' | 'mobile',
  raw: string,
): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new BadRequestException('target is required');
  }
  if (channel === 'email') {
    const email = trimmed.toLowerCase();
    if (!EMAIL_RE.test(email)) {
      throw new BadRequestException('Invalid email address');
    }
    return email;
  }
  if (trimmed.replace(/\D/g, '').length < 8) {
    throw new BadRequestException(
      'Enter a valid phone number (at least 8 digits)',
    );
  }
  return trimmed;
}

@Injectable()
export class UserContactOtpService {
  constructor(
    @InjectModel(UserContactOtp.name)
    private readonly otpModel: Model<UserContactOtpDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly emailService: EmailService,
  ) {}

  async sendOtp(dto: SendUserContactOtpDto) {
    const userId = requireObjectId(dto.userId);
    const channel = dto.channel === 'mobile' ? 'mobile' : 'email';
    const target = normalizeTarget(channel, dto.target);

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (channel === 'mobile') {
      // No Nest SMS provider yet — register the route so the UI gets a real
      // error instead of Cannot POST (#424 acceptance).
      throw new BadRequestException(
        'Phone OTP delivery is not available yet. Verify email contacts for now, or contact an engineer to enable SMS.',
      );
    }

    const otp = randomInt(100000, 1_000_000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.otpModel
      .findOneAndUpdate(
        { userId, channel, target },
        {
          $set: {
            otpHash: hashOtp(otp),
            expiresAt,
            attempts: 0,
            verified: false,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    await this.emailService.sendOtp(target, otp);

    return {
      success: true,
      message: 'OTP sent',
    };
  }

  async verifyOtp(dto: VerifyUserContactOtpDto) {
    const userId = requireObjectId(dto.userId);
    const channel = dto.channel === 'mobile' ? 'mobile' : 'email';
    const target = normalizeTarget(channel, dto.target);
    const otp = dto.otp.trim();

    const doc = await this.otpModel
      .findOne({ userId, channel, target })
      .exec();
    if (!doc || doc.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('No active OTP. Click Send OTP first.');
    }
    if (doc.attempts >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many incorrect attempts. Request a new OTP.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!timingSafeEqualHex(doc.otpHash, hashOtp(otp))) {
      doc.attempts += 1;
      await doc.save();
      throw new BadRequestException('Invalid OTP');
    }

    doc.verified = true;
    await doc.save();
    // One-time use: delete so a replay cannot succeed.
    await this.otpModel.deleteOne({ _id: doc._id }).exec();

    return { success: true, verified: true };
  }

  /**
   * Persist withdraw-detail profile edits onto the User document.
   * Multi-row contacts collapse to primary email/mobile (schema is singular).
   */
  async updateWithdrawUser(dto: UpdateWithdrawUserDto) {
    const userId = requireObjectId(dto.userId);
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const patch: Record<string, unknown> = {};
    if (Array.isArray(dto.emails)) {
      const list = dto.emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
      patch.email = list[0] ?? '';
      if (list[0]) {
        patch.email_verified = true;
      }
    }
    if (Array.isArray(dto.mobiles)) {
      const list = dto.mobiles.map((m) => m.trim()).filter(Boolean);
      patch.mobile = list[0] ?? '';
    }
    if (typeof dto.fullName === 'string') {
      patch.username = dto.fullName.trim();
    }
    if (typeof dto.gender === 'string') {
      patch.gender = dto.gender.trim();
    }
    if (typeof dto.birthdate === 'string') {
      patch.birthdate = dto.birthdate.trim();
    }

    await this.userModel
      .findByIdAndUpdate(userId, { $set: patch }, { new: true })
      .exec();

    return {
      success: true,
      message: 'User profile updated',
      userId: String(userId),
    };
  }
}
