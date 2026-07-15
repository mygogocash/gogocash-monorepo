/* eslint-disable prettier/prettier */
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getAdminAuth } from 'src/auth/firebase-admin.provider';
import { CreateUserDto, UpdateCountryDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model, Types } from 'mongoose';
import { UserMyCashback } from './schemas/user-my-cashback.schema';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import { toIso2Server } from 'src/utils/country';
import { StoredMediaService } from 'src/media/stored-media.service';
import { MEDIA_FOLDER } from 'src/media/media-folders.config';

/**
 * Coerce any `country` field on an arbitrary DTO to canonical ISO-2 in place
 * (returns a new object — never mutates the input). Defence-in-depth: even if
 * a caller forgets to canonicalise upstream, persisted documents stay clean.
 */
function withCanonicalCountry<T extends { country?: string | null }>(
  dto: T,
): T {
  if (dto?.country === undefined) return dto;
  return { ...dto, country: toIso2Server(dto.country) };
}

/**
 * Fields a user is allowed to change on their OWN profile via PUT /user/profile.
 * Fail-closed allowlist: everything else — identity links (id_firebase,
 * id_crossmint, id_*), trust/financial state (email_verified, wallet_frozen,
 * privilege, credit_score, credit_tier), referral fields, mobile, disabled,
 * provider, email — is server-controlled and must never be mass-assignable
 * from a user-facing request.
 */
const SELF_EDITABLE_PROFILE_FIELDS = [
  'address',
  'username',
  'country',
  'birthdate',
  'gender',
  'id_card',
  'passport',
  'legal_address',
  'state',
  'city',
  'zip',
  'email_mcb',
  // avatar_url is server-set only via POST /user/profile/avatar (upload).
  'consent',
] as const;

/** Copy only allowlisted keys from an arbitrary (untrusted) body. */
function pickSelfEditableFields(
  dto: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of SELF_EDITABLE_PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(dto, key)) {
      safe[key] = dto[key];
    }
  }
  return safe;
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserMyCashback.name)
    private userMyCashbacksModel: Model<UserMyCashback>,
    private readonly storedMediaService: StoredMediaService,
  ) {}

  async createFromFirebase(createUserDto: CreateUserDto) {
    // Find or create the user in the database
    const user = await this.userModel.findOneAndUpdate(
      { id_firebase: createUserDto.id_firebase },
      withCanonicalCountry(createUserDto),
      { upsert: true, new: true },
    );

    return user;
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { username: { $regex: escapeRegexLiteral(search), $options: 'i' } },
            { email: { $regex: escapeRegexLiteral(search), $options: 'i' } },
            { address: { $regex: escapeRegexLiteral(search), $options: 'i' } },
            { mobile: { $regex: escapeRegexLiteral(search), $options: 'i' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.userModel.find(query).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  findOne(data: { [key: string]: string | Types.ObjectId }) {
    return this.userModel.findOne(data);
  }

  /**
   * Atomically claims a Firebase-verified canonical phone for one user.
   *
   * `verified_phone_e164` is protected by a sparse unique Mongo index. The
   * database therefore arbitrates concurrent claims across app instances;
   * the legacy `mobile` field is written in the same document operation for
   * existing readers and display surfaces.
   */
  async claimVerifiedPhone(id: Types.ObjectId | string, phoneE164: string) {
    try {
      return await this.userModel.findByIdAndUpdate(
        id,
        {
          $set: {
            mobile: phoneE164,
            verified_phone_e164: phoneE164,
          },
        },
        { new: true, runValidators: true },
      );
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        throw new ConflictException(
          'This phone number is already linked to another account. Sign in with that account or use a different phone number.',
        );
      }
      throw error;
    }
  }

  async update(id: Types.ObjectId, updateUserDto: UpdateUserDto) {
    // delete updateUserDto.mobile; // prevent updating mobile directly;
    // Order matters: unwrap the legacy { data: {...} } envelope FIRST, THEN
    // canonicalise country — otherwise a wrapped payload writes raw 'Thailand'
    // into the ISO-2 migrated collection.
    if (updateUserDto && 'data' in updateUserDto && updateUserDto.data) {
      updateUserDto = updateUserDto.data;
    }
    return this.userModel.findByIdAndUpdate(
      id,
      withCanonicalCountry(updateUserDto),
      { new: true },
    );
  }

  /**
   * Self-service profile update for the authenticated user (PUT /user/profile).
   * Unlike admin `update()`, this is a user-facing write, so it must NOT trust
   * the request body wholesale — server-controlled fields (email_verified,
   * wallet_frozen, privilege, credit_*, referral_*, mobile, identity links)
   * would otherwise be mass-assignable. See SELF_EDITABLE_PROFILE_FIELDS.
   */
  async updateProfile(id: Types.ObjectId, updateUserDto: UpdateUserDto) {
    // Unwrap the legacy { data: {...} } envelope first (matches update()).
    let body: Record<string, unknown> = (updateUserDto ?? {}) as Record<
      string,
      unknown
    >;
    if (body && 'data' in body && body.data) {
      body = body.data as Record<string, unknown>;
    }
    // Fail-closed allowlist: drop every server-controlled / unknown field
    // before it can reach the document.
    const safe = pickSelfEditableFields(body);
    return this.userModel.findByIdAndUpdate(id, withCanonicalCountry(safe), {
      new: true,
    });
  }

  async uploadProfileAvatar(id: Types.ObjectId, file: Express.Multer.File) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const avatar_url = await this.storedMediaService.replace(
      file,
      MEDIA_FOLDER.PROFILE_AVATARS,
      user.avatar_url,
    );

    return this.userModel.findByIdAndUpdate(id, { avatar_url }, { new: true });
  }

  async streamProfileAvatar(id: Types.ObjectId, ref: string) {
    const user = await this.userModel.findById(id);
    if (!user?.avatar_url || user.avatar_url !== ref.trim()) {
      throw new UnauthorizedException('Avatar not found');
    }

    return this.storedMediaService.getReadableStream(ref);
  }

  private readonly deletionLogger = new Logger('AccountDeletion');

  /** 30-day grace window before the anonymizing purge (Play soft-delete). */
  static readonly DELETION_GRACE_DAYS = 30;

  async requestAccountDeletion(id: string, now: Date = new Date()) {
    const scheduledFor = new Date(
      now.getTime() + UserService.DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );
    const updated = await this.userModel.findOneAndUpdate(
      // Only untouched accounts transition; a repeat request must not push
      // the purge date out indefinitely.
      { _id: new Types.ObjectId(id), deletion_requested_at: null },
      { deletion_requested_at: now, deletion_scheduled_for: scheduledFor },
      { new: true },
    );
    if (updated) {
      return {
        deletionScheduledFor: updated.deletion_scheduled_for ?? scheduledFor,
      };
    }

    // Already pending (or unknown id) — surface the existing schedule.
    const existing = await this.userModel
      .find({ _id: new Types.ObjectId(id) })
      .limit(1)
      .exec();
    const pending = existing[0];
    if (!pending?.deletion_scheduled_for) {
      throw new UnauthorizedException('User not found');
    }
    return { deletionScheduledFor: pending.deletion_scheduled_for };
  }

  async cancelAccountDeletion(id: string) {
    await this.userModel.findOneAndUpdate(
      // Once purged there is nothing to restore.
      { _id: new Types.ObjectId(id), anonymized_at: null },
      { deletion_requested_at: null, deletion_scheduled_for: null },
      { new: true },
    );
    return { cancelled: true };
  }

  /**
   * Daily anonymizing purge. Deletes the Firebase credential first — if that
   * fails (transient), the user is skipped and retried on the next run so we
   * never orphan a live credential against an anonymized record. PII fields
   * are blanked; the doc (and financial history keyed on _id) survives.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeDueAccountDeletionsCron() {
    const purged = await this.purgeDueAccountDeletions(new Date());
    if (purged > 0) {
      this.deletionLogger.log(
        `Anonymized ${purged} account(s) past the grace window`,
      );
    }
  }

  async purgeDueAccountDeletions(now: Date): Promise<number> {
    const due = await this.userModel
      .find({
        deletion_scheduled_for: { $lte: now, $ne: null },
        anonymized_at: null,
      })
      .exec();

    let purged = 0;
    for (const user of due) {
      try {
        await getAdminAuth().deleteUser(user.id_firebase);
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code !== 'auth/user-not-found') {
          this.deletionLogger.error(
            `Firebase delete failed for user ${String(user._id)} — retrying next run`,
            error instanceof Error ? error.stack : String(error),
          );
          continue;
        }
      }

      await this.userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            anonymized_at: now,
            disabled: true,
            address: '',
            avatar_url: '',
            birthdate: '',
            city: '',
            email: '',
            email_mcb: '',
            gender: '',
            id_card: '',
            id_firebase: `deleted:${String(user._id)}`,
            id_line: '',
            id_telegram: '',
            id_twitter: '',
            legal_address: '',
            mobile: '',
            passport: '',
            state: '',
            username: '',
            zip: '',
          },
        },
      );
      purged += 1;
    }
    return purged;
  }

  updateCountry(updateCountryDto: UpdateCountryDto, id: string) {
    return this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { country: toIso2Server(updateCountryDto.country) },
      { new: true },
    );
  }

  async getBalanceMyCashback(userId: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.email || !user?.mobile) {
      throw new Error('User email or mobile not found');
    }
    // let userMyCashback: UserMyCashback[] = null;
    // if (user?.mobile) {
    //   userMyCashback = await this.userMyCashbacksModel
    //     .find({
    //       phoneNumber: user.mobile,
    //     })
    //     .lean();
    // }
    // if (userMyCashback?.length < 1) {
    //   if (user?.email) {
    //     userMyCashback = await this.userMyCashbacksModel
    //       .find({
    //         email: user.email,
    //       })
    //       .lean();
    //   }
    // }
    // const mobileData = user?.mobile?.includes('+66')
    //   ? user?.mobile?.slice(3)
    //   : user?.mobile;
    // const mobile = '0' + mobileData;
    // if (userMyCashback?.length < 1) {
    //   userMyCashback = await this.userMyCashbacksModel
    //     .find({
    //       phoneNumber: mobile,
    //     })
    //     .lean();
    // }

    const mobileData = user?.mobile?.includes('+66')
      ? (user?.mobile?.slice(3)?.trim() ?? '')
      : (user?.mobile?.trim() ?? '');
    const normalizedMobile = mobileData.length > 0 ? `0${mobileData}` : null;

    // const myCashbackDataList = await this.userMyCashbackModel
    //   .find({
    //     $or: [{ email: user.email }, { phoneNumber: user.mobile }, { phoneNumber: mobile }],
    //   })
    //   .lean();

    let myCashbackDataList = [];
    if (user?.mobile) {
      const phoneOr: Array<{ phoneNumber: string }> = [
        { phoneNumber: user.mobile },
      ];
      if (normalizedMobile) {
        phoneOr.push({ phoneNumber: normalizedMobile });
      }
      myCashbackDataList = await this.userMyCashbacksModel
        .find({
          $or: phoneOr,
        })
        .lean();
    }

    if (myCashbackDataList?.length < 1) {
      myCashbackDataList = await this.userMyCashbacksModel
        .find({
          email: {
            $regex: `^${escapeRegexLiteral(user.email)}$`,
            $options: 'i',
          },
        })
        .lean();
    }

    myCashbackDataList = myCashbackDataList.filter((row) =>
      this.isOwnedMyCashbackRecord(
        row,
        user.email,
        user.mobile,
        normalizedMobile,
      ),
    );

    if (myCashbackDataList.length < 1) {
      return { userMyCashback: null, user };
    }

    const myCashbackDataGroupCurrency = myCashbackDataList.reduce(
      (acc, cashback) => {
        cashback.balance?.forEach((balance) => {
          const currency = balance.currency || 'THB'; // Default to THB if no currency specified
          acc[currency] = {
            ...balance,
            amount: (acc[currency]?.amount || 0) + (balance.amount || 0),
          };
        });
        return acc;
      },
      {},
    );
    return {
      userMyCashback: myCashbackDataList,
      sumBalance: myCashbackDataGroupCurrency,
      user,
    };
  }

  private isOwnedMyCashbackRecord(
    row: { email?: string; phoneNumber?: string },
    userEmail: string,
    userMobile: string,
    normalizedMobile: string | null,
  ): boolean {
    if (
      typeof row.email === 'string' &&
      row.email.toLowerCase() === userEmail.toLowerCase()
    ) {
      return true;
    }

    if (row.phoneNumber === userMobile) {
      return true;
    }

    return normalizedMobile != null && row.phoneNumber === normalizedMobile;
  }
}
