import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Connection, Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserAdmin } from './user-admin/schemas/user-admin.schema';
import { AdminToken } from './schemas/admin-token.schema';
import { AdminInviteState } from './schemas/admin-invite-state.schema';
import { EmailService } from 'src/email/email.service';
import { adminEmailEquals, normalizeAdminEmail } from './normalize-admin-email';
import { AdminActivityService } from './activity/admin-activity.service';
import { AdminActor } from './activity/admin-activity.actor';

const BCRYPT_ROUNDS = 10;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const INVITE_LEASE_MS = 2 * 60 * 1000; // 2 minutes
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_ADMIN_APP_URL = 'https://admin-staging.gogocash.co';
const INVITE_IN_PROGRESS_MESSAGE =
  'An invitation is already being sent for this email. Please wait a moment and try again.';

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 11000;

/**
 * Admin invite + password-reset flows. Both issue a one-time, hashed, expiring
 * token (AdminToken) and email a link to the admin app; the link's page POSTs
 * the raw token back to accept-invite / reset-password.
 */
@Injectable()
export class AdminInviteService {
  private readonly logger = new Logger(AdminInviteService.name);

  constructor(
    @InjectModel(UserAdmin.name)
    private readonly userAdminModel: Model<UserAdmin>,
    @InjectModel(AdminToken.name)
    private readonly tokenModel: Model<AdminToken>,
    @InjectModel(AdminInviteState.name)
    private readonly inviteStateModel: Model<AdminInviteState>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly adminActivity: AdminActivityService,
    @InjectConnection() private readonly connection: Connection,
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

  private async acquireInviteLease(email: string): Promise<{
    leaseOwner: string;
    previousActiveTokenHash: string | null;
  }> {
    const leaseOwner = randomBytes(16).toString('hex');
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + INVITE_LEASE_MS);

    try {
      const state = await this.inviteStateModel
        .findOneAndUpdate(
          {
            email,
            $or: [
              { leaseOwner: null },
              { leaseExpiresAt: null },
              { leaseExpiresAt: { $lte: now } },
            ],
          },
          {
            $set: { leaseOwner, leaseExpiresAt },
            $setOnInsert: { email, activeTokenHash: null },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        )
        .exec();

      if (!state) {
        throw new ConflictException(INVITE_IN_PROGRESS_MESSAGE);
      }

      return {
        leaseOwner,
        previousActiveTokenHash: state.activeTokenHash?.trim() || null,
      };
    } catch (error) {
      // With the unique email index, a locked existing row cannot match the
      // update filter, so the attempted upsert loses with E11000.
      if (error instanceof ConflictException || isDuplicateKeyError(error)) {
        throw new ConflictException(INVITE_IN_PROGRESS_MESSAGE);
      }
      throw error;
    }
  }

  private async releaseInviteLease(
    email: string,
    leaseOwner: string,
  ): Promise<void> {
    try {
      await this.inviteStateModel
        .updateOne(
          { email, leaseOwner },
          { $set: { leaseOwner: null, leaseExpiresAt: null } },
        )
        .exec();
    } catch {
      // The bounded expiry prevents a failed compensation write from creating
      // a permanent lock. Never include the mailbox or lease value in logs.
      this.logger.error('Failed to release an admin invite delivery lease.');
    }
  }

  private link(path: string, raw: string, email: string): string {
    return `${this.appUrl()}${path}?token=${raw}&email=${encodeURIComponent(email)}`;
  }

  /** Issue an invite for `email` with `role` and email an accept-invite link. */
  async invite(
    email: string,
    role: string,
    actor: AdminActor,
  ): Promise<{
    message: string;
    deliveryStatus: 'accepted';
  }> {
    const normalizedEmail = normalizeAdminEmail(email);
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    const existing = await this.userAdminModel
      .findOne({ email: normalizedEmail })
      .collation({ locale: 'en', strength: 2 })
      .exec();
    if (existing) {
      throw new BadRequestException('An admin with this email already exists');
    }

    const { leaseOwner, previousActiveTokenHash } =
      await this.acquireInviteLease(normalizedEmail);
    const raw = this.freshToken();
    const candidateTokenHash = this.hash(raw);
    let candidateId: unknown = null;

    try {
      // The previous authoritative hash remains unchanged until the provider
      // acknowledges this replacement and the promotion below succeeds.
      const candidate = await this.tokenModel.create({
        email: normalizedEmail,
        purpose: 'invite',
        role,
        tokenHash: candidateTokenHash,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        usedAt: null,
      });
      candidateId = candidate._id;

      const url = this.link('/accept-invite', raw, normalizedEmail);
      await this.emailService.sendEmail({
        to: normalizedEmail,
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

      // Matching the opaque lease owner prevents a timed-out sender from
      // overwriting a newer request that acquired the expired lease.
      const promoted = await this.inviteStateModel
        .findOneAndUpdate(
          { email: normalizedEmail, leaseOwner },
          {
            $set: {
              activeTokenHash: candidateTokenHash,
              leaseOwner: null,
              leaseExpiresAt: null,
            },
          },
          { new: true },
        )
        .exec();
      if (!promoted) {
        throw new ConflictException(
          'This invitation attempt was superseded. Please try again.',
        );
      }
    } catch (error) {
      if (candidateId) {
        try {
          await this.tokenModel.deleteOne({ _id: candidateId }).exec();
        } catch {
          this.logger.error(
            'Failed to remove an unacknowledged admin invite token.',
          );
        }
      }
      await this.releaseInviteLease(normalizedEmail, leaseOwner);
      throw error;
    }

    // The pointer above is the security boundary. Cleanup targets only the
    // previously authoritative hash, so it can never delete a newer request's
    // candidate after this lease has been released.
    if (previousActiveTokenHash) {
      try {
        await this.tokenModel
          .deleteMany({
            purpose: 'invite',
            email: normalizedEmail,
            tokenHash: previousActiveTokenHash,
          })
          .collation({ locale: 'en', strength: 2 })
          .exec();
      } catch {
        this.logger.error('Failed to retire a previous admin invite token.');
      }
    }

    await this.adminActivity.append({
      actor_type: 'admin',
      actor_id: actor.id,
      actor_label: actor.label,
      action: 'admin_user.invited',
      entity_type: 'admin_user',
      entity_id: normalizedEmail,
      summary: `Invited admin user ${normalizedEmail}`,
      metadata: { email: normalizedEmail, role },
    });

    return {
      message: 'Invitation accepted for delivery',
      deliveryStatus: 'accepted',
    };
  }

  /** Consume an invite token and create the admin account. */
  async acceptInvite(input: {
    token: string;
    email: string;
    username?: string;
    password: string;
  }): Promise<{ message: string }> {
    const normalizedEmail = normalizeAdminEmail(input.email);
    const token = input.token.trim();
    if (!token || !normalizedEmail) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const tokenHash = this.hash(token);
    const rec = await this.tokenModel
      .findOne({
        tokenHash,
        purpose: 'invite',
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!rec || !adminEmailEquals(rec.email, normalizedEmail)) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const inviteState = await this.inviteStateModel
      .findOne({ email: normalizedEmail })
      .exec();
    if (inviteState && inviteState.activeTokenHash !== tokenHash) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const existing = await this.userAdminModel
      .findOne({ email: normalizedEmail })
      .collation({ locale: 'en', strength: 2 })
      .exec();
    if (existing) {
      throw new BadRequestException('An admin with this email already exists');
    }

    const username = input.username?.trim() || normalizedEmail.split('@')[0];
    const password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const created = await this.userAdminModel.create({
      username,
      email: normalizedEmail,
      password,
      role: rec.role,
    });
    await this.tokenModel
      .updateOne({ _id: rec._id }, { usedAt: new Date() })
      .exec();

    await this.adminActivity.append({
      actor_type: 'admin',
      actor_id: String(created._id),
      actor_label: normalizedEmail,
      action: 'admin_user.accepted_invite',
      entity_type: 'admin_user',
      entity_id: String(created._id),
      summary: `Activated admin user ${normalizedEmail}`,
      metadata: { email: normalizedEmail, role: rec.role },
    });

    return { message: 'Account created. You can now sign in.' };
  }

  /** Email a reset link to an existing admin. Always returns generic success. */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = normalizeAdminEmail(email);
    const admin = await this.userAdminModel
      .findOne({ email: normalizedEmail })
      .collation({ locale: 'en', strength: 2 })
      .exec();
    if (admin) {
      const raw = this.freshToken();
      await this.tokenModel
        .deleteMany({
          purpose: 'reset',
          $or: [{ adminId: admin._id }, { email: normalizedEmail }],
        })
        .exec();

      await this.tokenModel.create({
        email: normalizedEmail,
        purpose: 'reset',
        adminId: admin._id,
        sessionVersion: admin.session_version ?? 0,
        role: null,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
        usedAt: null,
      });

      const url = this.link('/reset-password', raw, normalizedEmail);
      try {
        await this.emailService.sendEmail({
          to: normalizedEmail,
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
      } catch {
        // This endpoint is public and must return the same response for known
        // and unknown mailboxes. Invite delivery still fails loudly; password
        // reset delivery is logged without recipient/provider details.
        this.logger.error('Admin password reset email delivery failed.');
      }
    }

    // Same response whether or not the email exists (no account enumeration).
    return {
      message: 'If that email is registered, a reset link has been sent.',
    };
  }

  /** Consume a reset token and set a new password. */
  async resetPassword(input: {
    token: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    const normalizedEmail = normalizeAdminEmail(input.email);
    const token = input.token.trim();
    if (!token || !normalizedEmail) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const session = await this.connection.startSession();
    let adminId: string | null = null;

    try {
      await session.withTransaction(async () => {
        adminId = null;
        const rec = await this.tokenModel
          .findOneAndUpdate(
            {
              tokenHash: this.hash(token),
              purpose: 'reset',
              email: normalizedEmail,
              usedAt: null,
              expiresAt: { $gt: new Date() },
            },
            { $set: { usedAt: new Date() } },
            { new: true, session },
          )
          .exec();

        const tokenSessionVersion = rec?.sessionVersion;
        if (
          !rec?.adminId ||
          !adminEmailEquals(rec.email, normalizedEmail) ||
          typeof tokenSessionVersion !== 'number' ||
          !Number.isSafeInteger(tokenSessionVersion) ||
          tokenSessionVersion < 0
        ) {
          throw new BadRequestException('Invalid or expired reset link');
        }

        const versionFilter =
          tokenSessionVersion === 0
            ? {
                $or: [
                  { session_version: 0 },
                  { session_version: { $exists: false } },
                ],
              }
            : { session_version: tokenSessionVersion };
        const result = await this.userAdminModel
          .updateOne(
            { _id: rec.adminId, ...versionFilter },
            {
              $set: { password },
              $inc: { session_version: 1 },
            },
            { session },
          )
          .exec();

        if (result.matchedCount !== 1) {
          // Binding both identity and credential generation rejects a token
          // after account recreation or another successful password reset.
          throw new BadRequestException('Invalid or expired reset link');
        }
        adminId = String(rec.adminId);
        await this.adminActivity.appendRequired(
          {
            actor_type: 'admin',
            actor_id: adminId,
            actor_label: normalizedEmail,
            action: 'admin_user.password_reset',
            entity_type: 'admin_user',
            entity_id: adminId,
            summary: `Reset password for admin user ${normalizedEmail}`,
            metadata: { email: normalizedEmail },
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    if (!adminId) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    return { message: 'Password updated. You can now sign in.' };
  }
}
