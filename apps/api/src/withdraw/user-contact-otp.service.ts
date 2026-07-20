import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { Model, Types } from 'mongoose';
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
/** How long a successful verify may be used as proof for a profile save. */
const VERIFIED_PROOF_TTL_MS = 30 * 60_000;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Cleared after verify so the OTP code cannot be replayed; proof is `verified`. */
const CONSUMED_OTP_HASH = 'verified';

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function normalizeTarget(channel: 'email' | 'mobile', raw: string): string {
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

    try {
      await this.emailService.sendOtp(target, otp);
    } catch (err) {
      await this.otpModel.deleteOne({ userId, channel, target }).exec();
      throw err;
    }

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

    const doc = await this.otpModel.findOne({ userId, channel, target }).exec();
    if (
      !doc ||
      doc.verified ||
      doc.otpHash === CONSUMED_OTP_HASH ||
      doc.expiresAt.getTime() < Date.now()
    ) {
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

    // Keep a short-lived proof for update-withdraw-user. Clear the code so it
    // cannot be replayed; consume the proof on successful profile save.
    doc.verified = true;
    doc.otpHash = CONSUMED_OTP_HASH;
    doc.expiresAt = new Date(Date.now() + VERIFIED_PROOF_TTL_MS);
    await doc.save();

    return { success: true, verified: true };
  }

  async updateWithdrawUser(dto: UpdateWithdrawUserDto) {
    const userId = requireObjectId(dto.userId);
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const patch: Record<string, unknown> = {};
    const proofsToConsume: Array<{
      userId: Types.ObjectId;
      channel: 'email' | 'mobile';
      target: string;
    }> = [];

    if (Array.isArray(dto.emails)) {
      const list = dto.emails
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const nextEmail = list[0] ?? '';
      const currentEmail = String(user.email ?? '')
        .trim()
        .toLowerCase();
      if (nextEmail && nextEmail !== currentEmail) {
        await this.assertEmailAvailable(nextEmail, userId);
        await this.requireVerifiedProof(userId, 'email', nextEmail);
        proofsToConsume.push({
          userId,
          channel: 'email',
          target: nextEmail,
        });
        patch.email = nextEmail;
        patch.email_verified = true;
      } else if (!nextEmail && currentEmail) {
        patch.email = '';
        patch.email_verified = false;
      }
    }

    if (Array.isArray(dto.mobiles)) {
      const list = dto.mobiles.map((m) => m.trim()).filter(Boolean);
      const nextMobile = list[0] ?? '';
      const currentMobile = String(user.mobile ?? '').trim();
      if (nextMobile && nextMobile !== currentMobile) {
        throw new BadRequestException(
          'Phone OTP delivery is not available yet. Keep the existing mobile, or contact an engineer to enable SMS before changing it.',
        );
      }
      if (!nextMobile && currentMobile) {
        patch.mobile = '';
      }
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

    if (Object.keys(patch).length > 0) {
      await this.userModel
        .findByIdAndUpdate(userId, { $set: patch }, { new: true })
        .exec();
    }

    for (const proof of proofsToConsume) {
      await this.otpModel
        .deleteOne({
          userId: proof.userId,
          channel: proof.channel,
          target: proof.target,
          verified: true,
        })
        .exec();
    }

    return {
      success: true,
      message: 'User profile updated',
      userId: userId.toHexString(),
    };
  }

  private async requireVerifiedProof(
    userId: Types.ObjectId,
    channel: 'email' | 'mobile',
    target: string,
  ): Promise<void> {
    const proof = await this.otpModel
      .findOne({
        userId,
        channel,
        target,
        verified: true,
        expiresAt: { $gt: new Date() },
      })
      .exec();
    if (!proof) {
      throw new BadRequestException(
        `Verify the new ${channel} with OTP before saving.`,
      );
    }
  }

  private async assertEmailAvailable(
    email: string,
    userId: Types.ObjectId,
  ): Promise<void> {
    const taken = await this.userModel
      .findOne({
        email,
        _id: { $ne: userId },
      })
      .select({ _id: 1 })
      .lean()
      .exec();
    if (taken) {
      throw new ConflictException(
        'That email is already used by another account.',
      );
    }
  }
}
