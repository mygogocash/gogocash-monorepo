import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserAdmin } from './user-admin/schemas/user-admin.schema';
import { AdminToken } from './schemas/admin-token.schema';
import { EmailService } from 'src/email/email.service';

const BCRYPT_ROUNDS = 10;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_ADMIN_APP_URL = 'https://admin-staging.gogocash.co';

/**
 * Admin invite + password-reset flows. Both issue a one-time, hashed, expiring
 * token (AdminToken) and email a link to the admin app; the link's page POSTs
 * the raw token back to accept-invite / reset-password.
 */
@Injectable()
export class AdminInviteService {
  constructor(
    @InjectModel(UserAdmin.name) private readonly userAdminModel: Model<UserAdmin>,
    @InjectModel(AdminToken.name) private readonly tokenModel: Model<AdminToken>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  private appUrl(): string {
    return (
      this.config.get<string>('env.ADMIN_APP_URL') || DEFAULT_ADMIN_APP_URL
    ).replace(/\/$/, '');
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private freshToken(): string {
    return randomBytes(32).toString('hex');
  }

  private link(path: string, raw: string, email: string): string {
    return `${this.appUrl()}${path}?token=${raw}&email=${encodeURIComponent(email)}`;
  }

  /** Issue an invite for `email` with `role` and email an accept-invite link. */
  async invite(email: string, role: string): Promise<{ message: string }> {
    const existing = await this.userAdminModel.findOne({ email }).exec();
    if (existing) {
      throw new BadRequestException('An admin with this email already exists');
    }

    const raw = this.freshToken();
    await this.tokenModel
      .findOneAndUpdate(
        { email, purpose: 'invite' },
        {
          email,
          purpose: 'invite',
          role,
          tokenHash: this.hash(raw),
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          usedAt: null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    const url = this.link('/accept-invite', raw, email);
    await this.emailService.sendEmail({
      to: email,
      subject: "You're invited to GoGoCash Admin",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color:#333;">GoGoCash Admin invitation</h2>
          <p>You've been invited to the GoGoCash admin panel as <strong>${role}</strong>.</p>
          <p>Set your password to activate your account:</p>
          <p style="margin:24px 0;"><a href="${url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Accept invitation</a></p>
          <p style="color:#666;">This link expires in 7 days. If you didn't expect this, ignore this email.</p>
          <p style="color:#888;font-size:12px;">GoGoCash Admin</p>
        </div>`,
      text: `You've been invited to GoGoCash Admin as ${role}. Set your password: ${url} (expires in 7 days)`,
    });

    return { message: 'Invitation sent' };
  }

  /** Consume an invite token and create the admin account. */
  async acceptInvite(input: {
    token: string;
    email: string;
    username?: string;
    password: string;
  }): Promise<{ message: string }> {
    const rec = await this.tokenModel
      .findOne({
        tokenHash: this.hash(input.token),
        purpose: 'invite',
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!rec || rec.email !== input.email) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const existing = await this.userAdminModel.findOne({ email: rec.email }).exec();
    if (existing) {
      throw new BadRequestException('An admin with this email already exists');
    }

    const username = input.username?.trim() || rec.email.split('@')[0];
    const password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await this.userAdminModel.create({
      username,
      email: rec.email,
      password,
      role: rec.role,
    });
    await this.tokenModel.updateOne({ _id: rec._id }, { usedAt: new Date() }).exec();

    return { message: 'Account created. You can now sign in.' };
  }

  /** Email a reset link to an existing admin. Always returns generic success. */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const admin = await this.userAdminModel.findOne({ email }).exec();
    if (admin) {
      const raw = this.freshToken();
      await this.tokenModel
        .findOneAndUpdate(
          { email, purpose: 'reset' },
          {
            email,
            purpose: 'reset',
            role: null,
            tokenHash: this.hash(raw),
            expiresAt: new Date(Date.now() + RESET_TTL_MS),
            usedAt: null,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .exec();

      const url = this.link('/reset-password', raw, email);
      await this.emailService.sendEmail({
        to: email,
        subject: 'Reset your GoGoCash Admin password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#333;">Password reset</h2>
            <p>We received a request to reset your GoGoCash Admin password.</p>
            <p style="margin:24px 0;"><a href="${url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Reset password</a></p>
            <p style="color:#666;">This link expires in 1 hour. If you didn't request this, ignore this email — your password is unchanged.</p>
            <p style="color:#888;font-size:12px;">GoGoCash Admin</p>
          </div>`,
        text: `Reset your GoGoCash Admin password: ${url} (expires in 1 hour). If you didn't request this, ignore this email.`,
      });
    }

    // Same response whether or not the email exists (no account enumeration).
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  /** Consume a reset token and set a new password. */
  async resetPassword(input: {
    token: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    const rec = await this.tokenModel
      .findOne({
        tokenHash: this.hash(input.token),
        purpose: 'reset',
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!rec || rec.email !== input.email) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const admin = await this.userAdminModel.findOne({ email: rec.email }).exec();
    if (!admin) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    admin.password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await admin.save();
    await this.tokenModel.updateOne({ _id: rec._id }, { usedAt: new Date() }).exec();

    return { message: 'Password updated. You can now sign in.' };
  }
}
