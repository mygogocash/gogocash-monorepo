import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateAdminDto } from './dto/create-admin.dto';
import {
  ProductTypeDto,
  ADMIN_ASSIGNABLE_ROLES,
  SaveTopBrandsDto,
  UpdateAdminDto,
  UpdateBannerHomeDto,
  UpdateSpecificPageBannerDto,
  UpdateFeeRateDto,
  UpdateRequestWithdrawDto,
  MYCASHBACK_USERS_DEFAULT_LIMIT,
  MYCASHBACK_USERS_MAX_LIMIT,
  MYCASHBACK_USERS_MAX_PAGE,
  MYCASHBACK_USERS_MAX_SEARCH_LENGTH,
  MYCASHBACK_USER_SORTS,
  type MyCashbackUserSort,
} from './dto/update-admin.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { UserAdmin } from './user-admin/schemas/user-admin.schema';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import {
  Withdraw,
  type WithdrawDocument,
} from 'src/withdraw/schemas/withdraw.schema';
import { WithdrawFeeCoupon } from 'src/withdraw/schemas/withdraw-fee-coupon.schema';
import { WithdrawFeeCouponRedemption } from 'src/withdraw/schemas/withdraw-fee-coupon-redemption.schema';
import {
  isAllowedWithdrawStatusTransition,
  shouldRestoreWithdrawFeeCoupon,
  WITHDRAW_ADMIN_STATUSES,
} from './restore-withdraw-fee-coupon';
import { AdminActivityService } from './activity/admin-activity.service';
import type { AdminActor } from './activity/admin-activity.actor';
import { InvolveService } from 'src/involve/involve.service';
import { User } from 'src/user/schemas/user.schema';
import { FeeRate } from 'src/withdraw/schemas/feeRate.schema';
import { StoredMediaService } from 'src/media/stored-media.service';
import { MEDIA_FOLDER } from 'src/media/media-folders.config';
import { Offer } from 'src/offer/schemas/offer.schema';
import { OfferDisplayTags } from 'src/offer/offer-display-tags.util';
import { Category } from 'src/offer/schemas/category.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { Banner } from 'src/offer/schemas/banner.schema';
import { ALL_BRAND_BANNER_MODEL } from 'src/offer/schemas/banner.schema';
import { SPECIFIC_PAGE_BANNER_MODEL } from 'src/offer/schemas/specific-page-banner.schema';
import { requireSpecificPageBannerTarget } from 'src/offer/specific-page-banner.contract';
import { TopBrandConfig } from 'src/offer/schemas/top-brand-config.schema';
import {
  MAX_TOP_BRANDS,
  normalizeTopBrandEntries,
  resolveDeviceBrandEntries,
  resolveOfferCashbackLabel,
} from 'src/offer/top-brand.contract';
import {
  mirrorTopBrandExtraStoreFlags,
  syncOfferTopBrandMembership,
  topBrandMemberIds,
} from 'src/offer/top-brand-membership';
import { UserService } from 'src/user/user.service';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import {
  mongoCaseInsensitiveRegex,
  mongoEq,
  mongoFilter,
  mongoIn,
  mongoSetUpdate,
  requireFiniteNumber,
  requireObjectId,
  requireOneOf,
  requireTrimmedString,
} from 'src/common/mongo-query';
import { buildFeeRateUpdate } from './fee-rate-update';
import { CategoryIntegrityService } from 'src/policy/category-integrity.service';
import { PolicyMediaCleanupService } from 'src/policy/policy-media-cleanup.service';
import {
  PolicyMediaWriteService,
  policyMediaWritePayloadHash,
  type PolicyMediaWriteAssets,
} from 'src/policy/policy-media-write.service';
import { PolicyMediaAssetRegistryService } from 'src/policy/policy-media-asset-registry.service';
import { requireProductTypeRowsField } from 'src/offer/product-type.util';

type AdminOfferUpdateData = {
  logo_desktop?: Express.Multer.File;
  logo_mobile?: Express.Multer.File;
  banner?: Express.Multer.File;
  banner_mobile?: Express.Multer.File;
  logo_circle?: Express.Multer.File;
  offer_name_display?: string;
  lookup_value?: string;
  offer_display_tags?: OfferDisplayTags;
  disabled?: boolean;
  commission_store?: number;
  max_cap?: number;
  extra_store?: boolean;
  tracking_link?: string;
  /** Present only when the admin PATCH included product_type(s). */
  product_type?: ProductTypeDto[] | Array<Record<string, unknown>> | string;
  all_product_types?: boolean;
  upsize_start_date?: string | null;
  upsize_end_date?: string | null;
  upsize_start_time?: string | null;
  upsize_end_time?: string | null;
  upsize_special_commission?: number | null;
  upsize_max_cap?: number | null;
  upsize_all_product_types?: boolean;
  /** Present only when the admin PATCH included upsize_product_types. */
  upsize_product_types?:
    | ProductTypeDto[]
    | Array<Record<string, unknown>>
    | string;
  tracking_period_mode?: 'auto' | 'manual';
  tracking_days?: number;
  confirm_days?: number;
  flow_type?: 'three_step' | 'two_step';
  tracking_subtitle?: string;
  confirm_subtitle?: string;
  policy_category_id?: string;
  custom_terms?: string;
  note_to_user?: string;
};

/** Persist product_type rows; string input is validated (400 on bad JSON). */
function coerceProductTypeForPersist(
  value:
    | AdminOfferUpdateData['product_type']
    | AdminOfferUpdateData['upsize_product_types'],
): Array<Record<string, unknown>> | ProductTypeDto[] {
  if (typeof value === 'string') {
    return requireProductTypeRowsField(value, 'product_type') ?? [];
  }
  return (value ?? []) as Array<Record<string, unknown>> | ProductTypeDto[];
}

/** Partial $set fragment for upsize fields (absent key = leave unchanged). */
function upsizePersistPatch(
  updateData: AdminOfferUpdateData,
): Record<string, unknown> {
  return {
    ...(updateData.upsize_start_date !== undefined
      ? { upsize_start_date: updateData.upsize_start_date }
      : {}),
    ...(updateData.upsize_end_date !== undefined
      ? { upsize_end_date: updateData.upsize_end_date }
      : {}),
    ...(updateData.upsize_start_time !== undefined
      ? { upsize_start_time: updateData.upsize_start_time }
      : {}),
    ...(updateData.upsize_end_time !== undefined
      ? { upsize_end_time: updateData.upsize_end_time }
      : {}),
    ...(updateData.upsize_special_commission !== undefined
      ? { upsize_special_commission: updateData.upsize_special_commission }
      : {}),
    ...(updateData.upsize_max_cap !== undefined
      ? { upsize_max_cap: updateData.upsize_max_cap }
      : {}),
    ...(updateData.upsize_all_product_types !== undefined
      ? { upsize_all_product_types: updateData.upsize_all_product_types }
      : {}),
    ...(updateData.upsize_product_types !== undefined
      ? {
          upsize_product_types: coerceProductTypeForPersist(
            updateData.upsize_product_types,
          ),
        }
      : {}),
  };
}

type AdminCategoryUpdateData = {
  name?: string;
  image?: Express.Multer.File;
  banner?: Express.Multer.File;
};

const SUPERADMIN_ROLES = ['superadmin', 'super_admin'] as const;
const ADMIN_SECURITY_LOCK_COLLECTION = 'admin_security_locks';
const ADMIN_ROSTER_LOCK_ID = 'superadmin-roster';

function isSuperadminRole(role: unknown): boolean {
  return SUPERADMIN_ROLES.includes(
    String(role ?? '') as (typeof SUPERADMIN_ROLES)[number],
  );
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserAdmin.name) private userAdminModel: Model<UserAdmin>,
    @InjectModel(Withdraw.name) private withdrawModel: Model<Withdraw>,
    @InjectModel(WithdrawFeeCoupon.name)
    private withdrawFeeCouponModel: Model<WithdrawFeeCoupon>,
    @InjectModel(WithdrawFeeCouponRedemption.name)
    private withdrawFeeCouponRedemptionModel: Model<WithdrawFeeCouponRedemption>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(UserMyCashback.name)
    private userMyCashbackModel: Model<UserMyCashback>,
    @InjectModel(Banner.name) private bannerModel: Model<Banner>,
    @InjectModel(ALL_BRAND_BANNER_MODEL)
    private allBrandBannerModel: Model<Banner>,
    @InjectModel(SPECIFIC_PAGE_BANNER_MODEL)
    private specificPageBannerModel: Model<Banner>,
    @InjectModel(TopBrandConfig.name)
    private topBrandConfigModel: Model<TopBrandConfig>,
    @InjectModel(Deeplink.name) private deeplinkModel: Model<Deeplink>,

    private readonly storedMediaService: StoredMediaService,
    private involveService: InvolveService,
    private userService: UserService,
    private readonly jobService: JobService,
    private readonly categoryIntegrity: CategoryIntegrityService,
    private readonly policyMediaCleanup: PolicyMediaCleanupService,
    private readonly policyMediaWrite: PolicyMediaWriteService,
    private readonly policyMediaRegistry: PolicyMediaAssetRegistryService,
    private readonly adminActivity: AdminActivityService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private async surfaceMediaCleanup<T>(
    saved: T,
    requestKey: string,
    code: 'OFFER_MEDIA_CLEANUP_PENDING' | 'CATEGORY_MEDIA_CLEANUP_PENDING',
  ): Promise<T | (Record<string, unknown> & { media_cleanup_pending: true })> {
    let cleanup: { deleted: number; pending: number };
    try {
      cleanup = await this.policyMediaCleanup.processRequest(requestKey);
    } catch {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code,
        message: `The update committed, but media cleanup is pending. Retry with key ${requestKey}.`,
        request_key: requestKey,
      });
    }
    if (cleanup.pending === 0) return saved;
    const value =
      saved &&
      typeof saved === 'object' &&
      'toObject' in saved &&
      typeof saved.toObject === 'function'
        ? saved.toObject()
        : saved && typeof saved === 'object'
          ? { ...saved }
          : { value: saved };
    return {
      ...(value as Record<string, unknown>),
      media_cleanup_pending: true,
      media_cleanup_request_key: requestKey,
    };
  }
  create(_createAdminDto: CreateAdminDto) {
    void _createAdminDto;
    return 'This action adds a new admin';
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { username: { $regex: escapeRegexLiteral(search), $options: 'i' } },
            { email: { $regex: escapeRegexLiteral(search), $options: 'i' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.userAdminModel
        .find(query)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userAdminModel.countDocuments(query).exec(),
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

  findOne(id: string) {
    return this.userAdminModel
      .findById(requireObjectId(id))
      .select('-password')
      .exec();
  }

  async update(id: string, updateAdminDto: UpdateAdminDto, actor: AdminActor) {
    const adminId = requireObjectId(id, 'admin id');
    const role = requireOneOf(
      requireTrimmedString(updateAdminDto.role, 32, 'admin role'),
      ADMIN_ASSIGNABLE_ROLES,
      'admin role',
    );
    const actorId = requireTrimmedString(actor.id, 128, 'admin actor id');
    const actorLabel = requireTrimmedString(
      actor.label || actor.id,
      320,
      'admin actor label',
    );
    const { updated, changed } = await this.withAdminRosterLock(
      async (session) => {
        const previous = await this.userAdminModel
          .findById(adminId)
          .select('-password')
          .session(session)
          .exec();
        if (!previous) {
          throw new NotFoundException('Admin user not found.');
        }
        if (String(previous.role) === role) {
          return { previous, updated: previous, changed: false };
        }
        if (isSuperadminRole(previous.role) && !isSuperadminRole(role)) {
          await this.assertAnotherSuperadminExists(session);
        }

        const updated = await this.userAdminModel
          .findOneAndUpdate(
            { _id: adminId, role: previous.role },
            mongoSetUpdate({ role }),
            { new: true, session },
          )
          .select('-password')
          .exec();
        if (!updated) {
          throw new ConflictException(
            'The admin role changed while you were editing. Refresh and try again.',
          );
        }
        await this.adminActivity.appendRequired(
          {
            actor_type: 'admin',
            actor_id: actorId,
            actor_label: actorLabel,
            action: 'admin_role.changed',
            entity_type: 'admin_user',
            entity_id: String(updated._id),
            summary: `Admin role ${previous.role} → ${updated.role}`,
            metadata: {
              email: updated.email,
              previous_role: previous.role,
              role: updated.role,
            },
          },
          session,
        );
        return { previous, updated, changed: true };
      },
    );

    if (!changed) return updated;
    return updated;
  }

  async updateRequestWithdraw(
    updateRequestWithdrawDto: UpdateRequestWithdrawDto,
    file: Express.Multer.File,
    actor: AdminActor,
  ) {
    const withdrawId = requireObjectId(
      updateRequestWithdrawDto.id,
      'withdraw id',
    );
    const nextStatus = requireOneOf(
      requireTrimmedString(
        updateRequestWithdrawDto.status,
        64,
        'withdraw status',
      ).toLowerCase(),
      WITHDRAW_ADMIN_STATUSES,
      'withdraw status',
    );
    const actorId = requireTrimmedString(actor.id, 128, 'admin actor id');
    const actorLabel = requireTrimmedString(
      actor.label || actor.id,
      320,
      'admin actor label',
    );
    let slipFile: string | undefined;
    if (file) {
      slipFile = await this.storedMediaService.upload(
        file,
        MEDIA_FOLDER.WITHDRAW_SLIPS,
      );
    }

    let session: ClientSession | undefined;
    let updated: WithdrawDocument | undefined;
    let previousStatus: string | undefined;
    let statusChanged = false;
    let previousSlipFile: string | undefined;
    let slipChanged = false;
    let companionStatusChanges = 0;
    let restoredCoupon: { couponId: string; code?: string | null } | undefined;
    try {
      session = await this.connection.startSession();
      await session.withTransaction(async () => {
        // Mongo may retry this callback after a transient conflict. Clear all
        // attempt-local audit state so an aborted attempt cannot leak events.
        updated = undefined;
        previousStatus = undefined;
        statusChanged = false;
        previousSlipFile = undefined;
        slipChanged = false;
        companionStatusChanges = 0;
        restoredCoupon = undefined;

        const existing = await this.withdrawModel
          .findById(withdrawId)
          .session(session)
          .exec();
        if (!existing) {
          throw new NotFoundException('Withdrawal request not found.');
        }

        if (existing.method !== 'bank_transfer') {
          throw new ConflictException(
            'This endpoint can update bank-transfer withdrawals only. Use the dedicated settlement action for other payout methods.',
          );
        }

        previousStatus = String(existing.status).trim().toLowerCase();
        if (existing.withdraw_mode === 'manual' && nextStatus === 'approved') {
          throw new ConflictException(
            'Manual withdrawals must be completed with mark-paid.',
          );
        }
        previousSlipFile = existing.slip_file;
        slipChanged = Boolean(slipFile && slipFile !== existing.slip_file);
        if (slipChanged && existing.slip_file) {
          throw new ConflictException(
            'Payout evidence is immutable once attached. Use a dedicated correction workflow.',
          );
        }
        if (!isAllowedWithdrawStatusTransition(previousStatus, nextStatus)) {
          throw new ConflictException(
            `Withdrawal status cannot change from ${previousStatus} to ${nextStatus}.`,
          );
        }
        statusChanged = previousStatus !== nextStatus;

        if (
          statusChanged &&
          nextStatus === 'approved' &&
          !slipFile &&
          !existing.slip_file
        ) {
          throw new ConflictException(
            'Bank-transfer payout evidence is required before approval.',
          );
        }

        if (statusChanged && nextStatus === 'approved') {
          const payoutUser = await this.userModel
            .findOneAndUpdate(
              {
                _id: existing.user_id,
                wallet_frozen: { $ne: true },
              },
              { $inc: { withdraw_lock_seq: 1 } },
              { new: true, session },
            )
            .exec();
          if (!payoutUser) {
            const currentUser = await this.userModel
              .findById(existing.user_id)
              .session(session)
              .exec();
            if (currentUser?.wallet_frozen) {
              throw new ForbiddenException(
                'This wallet is frozen. Unfreeze it before approving a payout.',
              );
            }
            throw new NotFoundException('Withdrawal owner not found.');
          }
        }

        if (!statusChanged && !slipFile) {
          updated = existing;
          return;
        }

        const withdrawCas: Record<string, unknown> = {
          _id: withdrawId,
          status: existing.status,
        };
        if (slipFile) {
          if (existing.slip_file) {
            withdrawCas.slip_file = existing.slip_file;
          } else {
            withdrawCas.$or = [
              { slip_file: { $exists: false } },
              { slip_file: null },
              { slip_file: '' },
            ];
          }
        }

        const nextWithdraw = await this.withdrawModel
          .findOneAndUpdate(
            withdrawCas,
            mongoSetUpdate({
              status: nextStatus,
              ...(slipFile ? { slip_file: slipFile } : {}),
              ...(statusChanged && nextStatus === 'approved'
                ? { approved_by: actorId, approved_at: new Date() }
                : {}),
            }),
            { new: true, session },
          )
          .exec();
        if (!nextWithdraw) {
          throw new ConflictException(
            'The withdrawal changed while you were editing. Refresh and try again.',
          );
        }
        updated = nextWithdraw;

        if (statusChanged) {
          const companions = await this.withdrawModel
            .updateMany(
              {
                parent_withdraw_id: withdrawId,
                method: 'bank_transfer',
                status: existing.status,
              },
              mongoSetUpdate({ status: nextStatus }),
              { session },
            )
            .exec();
          companionStatusChanges = companions.modifiedCount;
        }

        if (
          shouldRestoreWithdrawFeeCoupon({
            previousStatus,
            nextStatus,
            couponId: existing.coupon_id,
          })
        ) {
          // findOneAndDelete is the idempotency claim: only the transaction that
          // actually consumes the redemption may restore one inventory unit.
          const redemption = await this.withdrawFeeCouponRedemptionModel
            .findOneAndDelete({ withdraw_id: withdrawId }, { session })
            .exec();
          if (redemption) {
            const inventory = await this.withdrawFeeCouponModel
              .updateOne(
                {
                  _id: redemption.coupon_id,
                  quantity_used: { $gt: 0 },
                },
                { $inc: { quantity_used: -1 } },
                { session },
              )
              .exec();
            if (inventory.modifiedCount !== 1) {
              throw new ConflictException(
                'Coupon inventory could not be restored safely.',
              );
            }
            restoredCoupon = {
              couponId: String(redemption.coupon_id),
              code: redemption.code_snapshot,
            };
          }
        }

        if (restoredCoupon) {
          await this.adminActivity.appendRequired(
            {
              actor_type: 'admin',
              actor_id: actorId,
              actor_label: actorLabel,
              action: 'withdraw.fee_coupon.restored',
              entity_type: 'withdraw',
              entity_id: String(withdrawId),
              summary: `Restored fee coupon ${restoredCoupon.code ?? ''} after withdraw reject`,
              metadata: {
                coupon_id: restoredCoupon.couponId,
                code: restoredCoupon.code,
                previous_status: previousStatus,
                next_status: nextStatus,
              },
            },
            session!,
          );
        }

        if (slipChanged && slipFile) {
          await this.adminActivity.appendRequired(
            {
              actor_type: 'admin',
              actor_id: actorId,
              actor_label: actorLabel,
              action: 'withdraw.slip_updated',
              entity_type: 'withdraw',
              entity_id: String(withdrawId),
              summary: 'Updated withdrawal payout evidence',
              metadata: {
                previous_slip_file: previousSlipFile,
                slip_file: slipFile,
                status: nextStatus,
              },
            },
            session!,
          );
        }

        if (statusChanged) {
          await this.adminActivity.appendRequired(
            {
              actor_type: 'admin',
              actor_id: actorId,
              actor_label: actorLabel,
              action: 'withdraw.status_changed',
              entity_type: 'withdraw',
              entity_id: String(withdrawId),
              summary: `Withdraw status ${previousStatus ?? 'unknown'} → ${nextStatus}`,
              metadata: {
                from: previousStatus,
                to: nextStatus,
                coupon_code: updated?.coupon_code,
                amount_net: updated?.amount_net,
                companion_status_changes: companionStatusChanges,
              },
            },
            session!,
          );
        }
      });
    } catch (error: unknown) {
      if (!slipFile) throw error;

      let authoritative: WithdrawDocument | null;
      try {
        authoritative = await this.withdrawModel
          .findById(withdrawId)
          .read('primary')
          .exec();
      } catch {
        // The transaction may have committed even though the driver surfaced an
        // error. Without a primary read we cannot prove that this object is
        // unreferenced, so preserving payout evidence is the only safe action.
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: 'WITHDRAW_EVIDENCE_COMMIT_OUTCOME_UNKNOWN',
          message:
            'The withdrawal evidence update may have committed, but its outcome could not be confirmed. Do not retry or replace the evidence; contact support.',
        });
      }

      if (authoritative?.slip_file === slipFile) {
        // UnknownTransactionCommitResult can be reported after a successful
        // commit. The unique fresh reference is authoritative proof that this
        // request committed, so reconcile to the stored record and continue.
        updated = authoritative;
      } else {
        try {
          await this.storedMediaService.deleteStored(slipFile);
        } catch {
          throw new ServiceUnavailableException({
            statusCode: 503,
            code: 'WITHDRAW_EVIDENCE_CLEANUP_PENDING',
            message:
              'The withdrawal update failed and uploaded evidence cleanup is pending. Contact support before retrying.',
          });
        }
        throw error;
      }
    } finally {
      await session?.endSession();
    }

    return updated;
  }

  async remove(id: string, actor: AdminActor) {
    const adminId = requireObjectId(id, 'admin id');
    const actorId = requireTrimmedString(actor.id, 128, 'admin actor id');
    const actorLabel = requireTrimmedString(
      actor.label || actor.id,
      320,
      'admin actor label',
    );
    await this.withAdminRosterLock(async (session) => {
      const existing = await this.userAdminModel
        .findById(adminId)
        .select('-password')
        .session(session)
        .exec();
      if (!existing) {
        throw new NotFoundException('Admin user not found.');
      }
      if (isSuperadminRole(existing.role)) {
        await this.assertAnotherSuperadminExists(session);
      }
      const deleted = await this.userAdminModel
        .findOneAndDelete({ _id: adminId, role: existing.role }, { session })
        .select('-password')
        .exec();
      if (!deleted) {
        throw new ConflictException(
          'The admin account changed while you were deleting it. Refresh and try again.',
        );
      }
      await this.adminActivity.appendRequired(
        {
          actor_type: 'admin',
          actor_id: actorId,
          actor_label: actorLabel,
          action: 'admin_user.deleted',
          entity_type: 'admin_user',
          entity_id: String(deleted._id),
          summary: `Deleted admin user ${deleted.email || deleted.username}`,
          metadata: {
            email: deleted.email,
            role: deleted.role,
          },
        },
        session,
      );
      return deleted;
    });
    // Do not return the deleted document: it still contains the password hash.
    return { acknowledged: true, deletedCount: 1 };
  }

  /** Serialize mutations that could otherwise concurrently remove every root. */
  private async withAdminRosterLock<T>(
    work: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    let result: T | undefined;
    try {
      await session.withTransaction(async () => {
        // Reset on driver retries so an aborted attempt cannot leak a result.
        result = undefined;
        await this.connection
          .collection<{ _id: string; sequence: number }>(
            ADMIN_SECURITY_LOCK_COLLECTION,
          )
          .findOneAndUpdate(
            { _id: ADMIN_ROSTER_LOCK_ID },
            { $inc: { sequence: 1 } },
            { upsert: true, session },
          );
        result = await work(session);
      });
    } finally {
      await session.endSession();
    }
    if (result === undefined) {
      throw new ServiceUnavailableException(
        'Admin account mutation did not complete.',
      );
    }
    return result;
  }

  private async assertAnotherSuperadminExists(
    session: ClientSession,
  ): Promise<void> {
    const count = await this.userAdminModel
      .countDocuments({ role: { $in: SUPERADMIN_ROLES } })
      .session(session)
      .exec();
    if (count <= 1) {
      throw new ConflictException(
        'At least one superadmin account must remain active.',
      );
    }
  }

  async getWithdrawAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    method?: string,
  ) {
    const skip = (page - 1) * limit;
    // Status/method are exact-match filters (from the admin table dropdowns);
    // search is a free-text regex that narrows *within* the selected filters.
    // Both compose as an implicit AND on the same query object.
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (method) query.method = method;
    if (search) {
      query.$or = [
        { method: { $regex: escapeRegexLiteral(search), $options: 'i' } },
        { status: { $regex: escapeRegexLiteral(search), $options: 'i' } },
        { address: { $regex: escapeRegexLiteral(search), $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.withdrawModel
        .find(query)
        .populate('user_id', 'username email address _id')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.withdrawModel.countDocuments(query).exec(),
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

  async getConversionInvolveAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
  ) {
    const conversions = await this.involveService.getConversionAll(
      {
        page: page,
        limit: limit,
      },
      search || status
        ? { offer_name: search, conversion_status: status }
        : null,
    );
    const data = await Promise.all(
      conversions?.data?.data?.map(async (conversion) => {
        if (conversion.aff_sub1?.includes('user_id:')) {
          conversion.aff_sub1 = conversion.aff_sub1.replace('user_id:', '');
        }
        const user = await this.userModel.findById(
          new Types.ObjectId(conversion.aff_sub1),
        );
        if (user) {
          return {
            ...conversion,
            user: { username: user.username, email: user.email, _id: user._id },
          };
        } else {
          return {
            ...conversion,
            user: null,
          };
        }
      }),
    );
    conversions.data.data = data?.sort(
      (a, b) =>
        new Date(b.datetime_conversion).getTime() -
        new Date(a.datetime_conversion).getTime(),
    );
    return conversions;
  }

  async getConversionAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    key?: string,
    status?: string,
  ) {
    const fee = await this.feeRateModel.findOne().exec();
    if (!fee) {
      throw new HttpException({ message: 'Fee rate not found' }, 400);
    }
    const filter = this.buildConversionListFilter(search, key, status);

    const skip = (page - 1) * limit;

    const allConversions = await this.conversionModel
      .aggregate([
        {
          $match: filter,
        },
        {
          // offer_id is unique only WITHIN a source (Involve vs Optimise/
          // Accesstrade can share a numeric offer_id). Match the offer on BOTH
          // source and offer_id so $unwind can't duplicate the conversion by
          // joining a same-id offer from another network. For Involve-only data
          // $$src === 'involve', i.e. byte-identical to the previous behaviour.
          $lookup: {
            from: 'offers',
            let: {
              oid: '$offer_id',
              src: { $ifNull: ['$source', 'involve'] },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [{ $ifNull: ['$source', 'involve'] }, '$$src'] },
                      { $eq: ['$offer_id', '$$oid'] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'offer',
          },
        },
        { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            max_cap: { $ifNull: ['$offer.max_cap', fee.max_cap] },
          },
        },
        {
          $addFields: {
            payoutNew: {
              $cond: [
                { $eq: ['$offer_name', 'reward_conversion_quest'] },
                '$payout',
                {
                  $let: {
                    vars: {
                      payoutAfterFee: {
                        $subtract: [
                          '$payout',
                          {
                            $divide: [
                              { $multiply: ['$payout', fee.system] },
                              100,
                            ],
                          },
                        ],
                      },
                    },
                    in: {
                      $cond: [
                        { $gt: ['$$payoutAfterFee', '$max_cap'] },
                        '$max_cap',
                        '$$payoutAfterFee',
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $project: {
            conversion_id: 1,
            adv_sub1: 1,
            adv_sub2: 1,
            adv_sub3: 1,
            adv_sub4: 1,
            adv_sub5: 1,
            aff_sub1: 1,
            aff_sub2: 1,
            aff_sub3: 1,
            aff_sub4: 1,
            aff_sub5: 1,
            affiliate_remarks: 1,
            base_payout: 1,
            bonus_payout: 1,
            conversion_status: 1,
            currency: 1,
            datetime_conversion: 1,
            merchant_id: 1,
            offer_id: 1,
            offer_name: 1,
            payout: 1,
            sale_amount: 1,
            add_point: 1,
            payoutNew: 1,
            _id: 1,
          },
        },
        // Sort BEFORE paginating — otherwise each page is sorted internally
        // but pages come back in natural insertion order (global newest-first
        // ordering regressed).
        {
          $sort: { datetime_conversion: -1 },
        },
        { $skip: skip },
        { $limit: limit },
      ])
      .exec();
    const [data, total] = await Promise.all([
      // this.conversionModel
      //   .find(filter)
      //   .skip(skip)
      //   .limit(limit)
      //   .sort({ datetime_conversion: -1 })
      //   .exec(),
      allConversions,
      this.conversionModel.countDocuments(filter).exec(),
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

  async getConversionInWithdraw(body: number[]) {
    const conversionIds = body.map((id) =>
      requireFiniteNumber(id, 'conversion id'),
    );
    return this.conversionModel
      .find(
        mongoFilter({
          conversion_id: mongoIn(conversionIds),
        }),
      )
      .sort({ datetime_conversion: -1 })
      .lean();
  }

  async getFeeRate() {
    return this.feeRateModel.find().exec();
  }

  async updateFeeRate(updateFeeRateDto: UpdateFeeRateDto, id: string) {
    const objectId = requireObjectId(id);
    const update = buildFeeRateUpdate(updateFeeRateDto);
    const feeRate = await this.feeRateModel.findOne({ _id: objectId }).exec();
    if (feeRate) {
      return this.feeRateModel
        .findOneAndUpdate({ _id: objectId }, mongoSetUpdate(update), {
          upsert: true,
          new: true,
        })
        .exec();
    }
    const newFeeRate = new this.feeRateModel(update);
    return newFeeRate.save();
  }

  async updateOffer(id: string, updateData: AdminOfferUpdateData) {
    // #475 — enable Top Brand only after curated list accepts the offer
    // (throws at max capacity before we persist a divergent extra_store flag).
    if (updateData.extra_store === true) {
      await syncOfferTopBrandMembership(this.topBrandConfigModel, id, true);
    }
    const updated = await this.categoryIntegrity.withNormalWrite({
      legacy: () => this.updateOfferLegacy(id, updateData),
      enforced: () => this.updateOfferWithIntegrity(id, updateData),
    });
    if (updateData.extra_store === false) {
      await syncOfferTopBrandMembership(this.topBrandConfigModel, id, false);
    }
    // #479 — disabling an offer pulls it out of curated Top brands.
    if (updateData.disabled === true) {
      await syncOfferTopBrandMembership(this.topBrandConfigModel, id, false);
    }
    return updated;
  }

  /** #479 — Top brands may only reference active (non-disabled) offers. */
  private async assertTopBrandOffersEligible(
    offerIds: readonly string[],
  ): Promise<void> {
    const unique = [
      ...new Set(
        offerIds.map((id) => String(id ?? '').trim()).filter((id) => id.length > 0),
      ),
    ];
    if (unique.length === 0) return;

    const offers = await this.offerModel
      .find({ _id: { $in: unique } })
      .select('_id disabled status')
      .lean()
      .exec();
    const byId = new Map(
      (offers ?? []).map((offer) => [String(offer._id), offer]),
    );
    const bad: string[] = [];
    for (const id of unique) {
      const offer = byId.get(id);
      if (!offer || offer.disabled === true) {
        bad.push(id);
        continue;
      }
      const status = String(
        (offer as { status?: unknown }).status ?? '',
      )
        .trim()
        .toLowerCase();
      if (status === 'pending_review' || status === 'rejected') {
        bad.push(id);
      }
    }
    if (bad.length > 0) {
      throw new BadRequestException(
        `Disabled or missing offers cannot be top brands: ${bad.join(', ')}`,
      );
    }
  }

  private async updateOfferLegacy(
    id: string,
    updateData: AdminOfferUpdateData,
  ) {
    const offer = await this.offerModel.findById(requireObjectId(id)).exec();
    if (!offer) throw new Error('Offer not found');
    const folder = MEDIA_FOLDER.BRANDS;
    const logoUpload = updateData.logo_desktop ?? updateData.logo_mobile;
    const logoAsset = logoUpload
      ? await this.storedMediaService.replace(
          logoUpload,
          folder,
          offer.logo_desktop ?? offer.logo_mobile ?? offer.logo,
        )
      : undefined;
    const bannerUpload =
      updateData.banner ?? updateData.banner_mobile ?? updateData.logo_circle;
    const bannerAsset = bannerUpload
      ? await this.storedMediaService.replace(
          bannerUpload,
          folder,
          offer.banner ?? offer.banner_mobile ?? offer.logo_circle,
        )
      : undefined;
    const trackingLink =
      typeof updateData.tracking_link === 'string' &&
      updateData.tracking_link.trim()
        ? updateData.tracking_link.trim()
        : offer.tracking_link;
    const nextLogoDesktop = logoAsset ?? offer.logo_desktop;
    const nextLogoMobile = logoAsset ?? offer.logo_mobile;
    const nextBanner = bannerAsset ?? offer.banner;
    const nextBannerMobile = bannerAsset ?? offer.banner_mobile;
    const nextLogoCircle = bannerAsset ?? offer.logo_circle;
    return this.offerModel
      .findByIdAndUpdate(
        requireObjectId(id),
        mongoSetUpdate({
          logo_desktop: nextLogoDesktop,
          logo_mobile: nextLogoMobile,
          logo: nextLogoDesktop || nextLogoMobile || offer.logo,
          banner: nextBanner,
          banner_mobile: nextBannerMobile,
          logo_circle: nextLogoCircle,
          offer_name_display:
            updateData.offer_name_display ?? offer.offer_name_display,
          lookup_value:
            typeof updateData.lookup_value === 'string'
              ? updateData.lookup_value.trim() || offer.lookup_value
              : offer.lookup_value,
          offer_display_tags:
            updateData.offer_display_tags !== undefined
              ? updateData.offer_display_tags
              : offer.offer_display_tags,
          disabled: Boolean(updateData.disabled ?? offer.disabled),
          commission_store:
            updateData.commission_store ?? offer.commission_store ?? 0,
          max_cap: updateData.max_cap ?? offer.max_cap ?? 0,
          extra_store: Boolean(updateData.extra_store ?? offer.extra_store),
          tracking_link: trackingLink,
          // Partial updates (brand info, T&C, …) must not wipe product rows.
          ...(updateData.product_type !== undefined
            ? {
                product_type: coerceProductTypeForPersist(
                  updateData.product_type,
                ),
              }
            : {}),
          ...(updateData.all_product_types !== undefined
            ? { all_product_types: updateData.all_product_types }
            : {}),
          ...upsizePersistPatch(updateData),
          ...(updateData.tracking_period_mode !== undefined
            ? { tracking_period_mode: updateData.tracking_period_mode }
            : {}),
          ...(updateData.tracking_days !== undefined
            ? { tracking_days: updateData.tracking_days }
            : {}),
          ...(updateData.confirm_days !== undefined
            ? { confirm_days: updateData.confirm_days }
            : {}),
          ...(updateData.flow_type !== undefined
            ? { flow_type: updateData.flow_type }
            : {}),
          ...(updateData.tracking_subtitle !== undefined
            ? { tracking_subtitle: updateData.tracking_subtitle }
            : {}),
          ...(updateData.confirm_subtitle !== undefined
            ? { confirm_subtitle: updateData.confirm_subtitle }
            : {}),
          ...(updateData.policy_category_id !== undefined
            ? { policy_category_id: updateData.policy_category_id }
            : {}),
          ...(updateData.custom_terms !== undefined
            ? { custom_terms: updateData.custom_terms }
            : {}),
          ...(updateData.note_to_user !== undefined
            ? { note_to_user: updateData.note_to_user }
            : {}),
        }),
        { new: true },
      )
      .exec();
  }

  private async updateOfferWithIntegrity(
    id: string,
    updateData: AdminOfferUpdateData,
  ) {
    const offer = await this.offerModel.findById(requireObjectId(id)).exec();
    if (!offer) {
      throw new Error('Offer not found');
    }
    if (updateData.policy_category_id !== undefined) {
      await this.categoryIntegrity.assertPolicyCategoryAssignmentReady(
        updateData.policy_category_id,
      );
    }
    const folder = MEDIA_FOLDER.BRANDS;
    const logoUpload = updateData.logo_desktop ?? updateData.logo_mobile;
    const bannerUpload =
      updateData.banner ?? updateData.banner_mobile ?? updateData.logo_circle;
    let logoAsset: string | undefined;
    let bannerAsset: string | undefined;
    let logoAssetProof: PolicyMediaWriteAssets[string] | undefined;
    let bannerAssetProof: PolicyMediaWriteAssets[string] | undefined;
    const trackingLink =
      typeof updateData.tracking_link === 'string' &&
      updateData.tracking_link.trim()
        ? updateData.tracking_link.trim()
        : offer.tracking_link;
    const buildUpdateDocument = () => {
      const nextLogoDesktop = logoAsset ?? offer.logo_desktop;
      const nextLogoMobile = logoAsset ?? offer.logo_mobile;
      const nextBanner = bannerAsset ?? offer.banner;
      const nextBannerMobile = bannerAsset ?? offer.banner_mobile;
      const nextLogoCircle = bannerAsset ?? offer.logo_circle;
      return mongoSetUpdate({
        logo_desktop: nextLogoDesktop,
        logo_mobile: nextLogoMobile,
        logo: nextLogoDesktop || nextLogoMobile || offer.logo,
        ...(logoAssetProof ? { logo_asset: logoAssetProof } : {}),
        banner: nextBanner,
        banner_mobile: nextBannerMobile,
        logo_circle: nextLogoCircle,
        ...(bannerAssetProof ? { banner_asset: bannerAssetProof } : {}),
        offer_name_display:
          updateData.offer_name_display ?? offer.offer_name_display,
        lookup_value:
          typeof updateData.lookup_value === 'string'
            ? updateData.lookup_value.trim() || offer.lookup_value
            : offer.lookup_value,
        offer_display_tags:
          updateData.offer_display_tags !== undefined
            ? updateData.offer_display_tags
            : offer.offer_display_tags,
        disabled: Boolean(updateData.disabled ?? offer.disabled),
        commission_store:
          updateData.commission_store ?? offer.commission_store ?? 0,
        max_cap: updateData.max_cap ?? offer.max_cap ?? 0,
        extra_store: Boolean(updateData.extra_store ?? offer.extra_store),
        tracking_link: trackingLink,
        ...(updateData.product_type !== undefined
          ? {
              product_type: coerceProductTypeForPersist(
                updateData.product_type,
              ),
            }
          : {}),
        ...(updateData.all_product_types !== undefined
          ? { all_product_types: updateData.all_product_types }
          : {}),
        ...upsizePersistPatch(updateData),
        ...(updateData.tracking_period_mode !== undefined
          ? { tracking_period_mode: updateData.tracking_period_mode }
          : {}),
        ...(updateData.tracking_days !== undefined
          ? { tracking_days: updateData.tracking_days }
          : {}),
        ...(updateData.confirm_days !== undefined
          ? { confirm_days: updateData.confirm_days }
          : {}),
        ...(updateData.flow_type !== undefined
          ? { flow_type: updateData.flow_type }
          : {}),
        ...(updateData.tracking_subtitle !== undefined
          ? { tracking_subtitle: updateData.tracking_subtitle }
          : {}),
        ...(updateData.confirm_subtitle !== undefined
          ? { confirm_subtitle: updateData.confirm_subtitle }
          : {}),
        ...(updateData.custom_terms !== undefined
          ? { custom_terms: updateData.custom_terms }
          : {}),
        ...(updateData.note_to_user !== undefined
          ? { note_to_user: updateData.note_to_user }
          : {}),
      });
    };
    const cleanupRequestKey =
      logoUpload || bannerUpload
        ? `offer-media:${requireObjectId(id)}:${randomUUID()}`
        : undefined;
    const cleanupAttemptToken = cleanupRequestKey ? randomUUID() : undefined;
    const save = async (
      assignment: Record<string, unknown>,
      session?: import('mongoose').ClientSession,
    ) => {
      let currentForCleanup = offer;
      if (cleanupRequestKey) {
        if (!session) {
          throw new Error(
            'Offer media replacement requires an integrity transaction',
          );
        }
        const current = await this.offerModel
          .findById(requireObjectId(id))
          .session(session)
          .lean();
        if (!current) throw new Error('Offer not found');
        currentForCleanup = current as typeof offer;
      }
      const { unset_policy_category_id, ...assignmentSet } = assignment;
      const updateDocument = buildUpdateDocument();
      if (cleanupRequestKey && session) {
        for (const url of new Set(
          [logoAsset, bannerAsset].filter((value): value is string =>
            Boolean(value),
          ),
        )) {
          await this.policyMediaRegistry.touchAttachInSession(url, session);
        }
      }
      const mutation = mongoSetUpdate({
        ...updateDocument.$set,
        ...assignmentSet,
      }) as Record<string, unknown>;
      if (unset_policy_category_id === true) {
        mutation.$unset = { policy_category_id: 1 };
      }
      const saved = await this.offerModel
        .findByIdAndUpdate(requireObjectId(id), mutation, {
          new: true,
          ...(session ? { session } : {}),
        })
        .exec();
      if (cleanupRequestKey && cleanupAttemptToken) {
        const replacedReferences = new Set<unknown>();
        if (logoAsset) {
          if (currentForCleanup.logo_asset) {
            replacedReferences.add(currentForCleanup.logo_asset);
          }
          for (const value of [
            currentForCleanup.logo_desktop,
            currentForCleanup.logo_mobile,
            currentForCleanup.logo,
          ]) {
            if (typeof value === 'string' && value && value !== logoAsset) {
              replacedReferences.add(value);
            }
          }
        }
        if (bannerAsset) {
          if (currentForCleanup.banner_asset) {
            replacedReferences.add(currentForCleanup.banner_asset);
          }
          for (const value of [
            currentForCleanup.banner,
            currentForCleanup.banner_mobile,
            currentForCleanup.logo_circle,
          ]) {
            if (typeof value === 'string' && value && value !== bannerAsset) {
              replacedReferences.add(value);
            }
          }
        }
        await this.policyMediaCleanup.journalLegacyReplacements(
          {
            owner_type: 'offer',
            owner_id: requireObjectId(id),
            request_key: cleanupRequestKey,
            attempt_token: cleanupAttemptToken,
            reason: 'offer-replaced',
            references: [...replacedReferences],
          },
          session,
        );
      }
      return saved;
    };
    let saved: unknown;
    if (cleanupRequestKey) {
      const ownerId = requireObjectId(id);
      saved = await this.policyMediaWrite.execute({
        requestKey: cleanupRequestKey,
        payloadHash: policyMediaWritePayloadHash({
          request_key: cleanupRequestKey,
          owner_id: String(ownerId),
          operation: 'offer-update',
          has_logo: Boolean(logoUpload),
          has_banner: Boolean(bannerUpload),
        }),
        ownerType: 'offer',
        ownerId,
        operation: 'offer-update',
        uploads: [
          ...(logoUpload ? [{ role: 'logo', file: logoUpload, folder }] : []),
          ...(bannerUpload
            ? [{ role: 'banner', file: bannerUpload, folder }]
            : []),
        ],
        commit: async (assets, session) => {
          logoAssetProof = assets.logo;
          bannerAssetProof = assets.banner;
          logoAsset = logoAssetProof?.url;
          bannerAsset = bannerAssetProof?.url;
          let assignment: Record<string, unknown> = {};
          if (updateData.policy_category_id !== undefined) {
            const current = await this.offerModel
              .findById(ownerId)
              .session(session)
              .select('categories')
              .lean();
            if (!current) throw new Error('Offer not found');
            assignment =
              await this.categoryIntegrity.policyCategoryAssignmentInSession(
                updateData.policy_category_id,
                current.categories,
                session,
              );
          }
          return save(assignment, session);
        },
        readCommittedOwner: () =>
          this.offerModel.findById(ownerId).read('primary').exec(),
      });
    } else {
      saved =
        updateData.policy_category_id !== undefined
          ? await this.categoryIntegrity.withPolicyCategoryAssignment(
              updateData.policy_category_id,
              async (session) => {
                const current = await this.offerModel
                  .findById(requireObjectId(id))
                  .session(session)
                  .select('categories')
                  .lean();
                if (!current) throw new Error('Offer not found');
                return current.categories;
              },
              save,
            )
          : await this.categoryIntegrity.withIntegrityMutation((session) =>
              save({}, session),
            );
    }
    if (cleanupRequestKey) {
      return this.surfaceMediaCleanup(
        saved,
        cleanupRequestKey,
        'OFFER_MEDIA_CLEANUP_PENDING',
      );
    }
    return saved;
  }

  /**
   * Create a policy category. `name` is unique at the schema level; the Mongo
   * duplicate-key error is translated into a 400 the admin UI can toast
   * verbatim. Returns the bare created document (the UI reads `_id`/`name`).
   */
  async createCategory(name: string) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      throw new BadRequestException('name is required');
    }
    return this.categoryIntegrity.createLegacyCategory(trimmed);
  }

  async updateCategory(id: string, updateData: AdminCategoryUpdateData) {
    return this.categoryIntegrity.withNormalWrite({
      legacy: () => this.updateCategoryLegacy(id, updateData),
      enforced: () => this.updateCategoryWithIntegrity(id, updateData),
    });
  }

  private async updateCategoryLegacy(
    id: string,
    updateData: AdminCategoryUpdateData,
  ) {
    const data = await this.categoryModel.findById(id).exec();
    if (!data) throw new Error('data not found');
    const image = updateData.image
      ? await this.storedMediaService.replace(
          updateData.image,
          MEDIA_FOLDER.CATEGORIES,
          data.image,
        )
      : undefined;
    const banner = updateData.banner
      ? await this.storedMediaService.replace(
          updateData.banner,
          MEDIA_FOLDER.CATEGORIES,
          data.banner,
        )
      : undefined;
    try {
      return await this.categoryModel
        .findByIdAndUpdate(
          requireObjectId(id),
          {
            ...(updateData.name !== undefined ? { name: updateData.name } : {}),
            image: image ?? data.image,
            banner: banner ?? data.banner,
          },
          { new: true },
        )
        .exec();
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000 &&
        updateData.name !== undefined
      ) {
        throw new BadRequestException(
          `A category named "${updateData.name}" already exists.`,
        );
      }
      throw error;
    }
  }

  private async updateCategoryWithIntegrity(
    id: string,
    updateData: AdminCategoryUpdateData,
  ) {
    const data = await this.categoryModel.findById(id).exec();
    if (!data) {
      throw new Error('data not found');
    }
    if (!updateData.image && !updateData.banner) {
      return this.categoryIntegrity.updateLegacyCategoryMetadata(
        id,
        updateData.name === undefined ? {} : { name: updateData.name },
      );
    }
    const ownerId = requireObjectId(id);
    const requestKey = `category-media:${ownerId}:${randomUUID()}`;
    const cleanupAttemptToken = randomUUID();
    const saved = await this.policyMediaWrite.execute({
      requestKey,
      payloadHash: policyMediaWritePayloadHash({
        request_key: requestKey,
        owner_id: String(ownerId),
        operation: 'category-update',
        has_image: Boolean(updateData.image),
        has_banner: Boolean(updateData.banner),
      }),
      ownerType: 'category',
      ownerId,
      operation: 'category-update',
      uploads: [
        ...(updateData.image
          ? [
              {
                role: 'image',
                file: updateData.image,
                folder: MEDIA_FOLDER.CATEGORIES,
              },
            ]
          : []),
        ...(updateData.banner
          ? [
              {
                role: 'banner',
                file: updateData.banner,
                folder: MEDIA_FOLDER.CATEGORIES,
              },
            ]
          : []),
      ],
      commit: async (assets, session) => {
        const current = await this.categoryModel
          .findOne({ _id: ownerId, lifecycle_status: 'active' })
          .session(session)
          .lean();
        if (!current) throw new Error('Category not found or inactive');
        const set: Record<string, unknown> = {};
        const replaced: unknown[] = [];
        if (updateData.name !== undefined) {
          Object.assign(
            set,
            await this.categoryIntegrity.reserveLegacyCategoryRenameInSession(
              id,
              updateData.name,
              session,
            ),
          );
        }
        if (assets.image) {
          set.image = assets.image.url;
          set.image_asset = assets.image;
          replaced.push(current.image_asset ?? current.image);
        }
        if (assets.banner) {
          set.banner = assets.banner.url;
          set.banner_asset = assets.banner;
          replaced.push(current.banner_asset ?? current.banner);
        }
        const updated = await this.categoryModel
          .findOneAndUpdate(
            {
              _id: ownerId,
              lifecycle_status: 'active',
              revision: current.revision,
            },
            { $set: set, $inc: { revision: 1 } },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!updated) throw new Error('Category changed; refresh and retry');
        await this.policyMediaCleanup.journalLegacyReplacements(
          {
            owner_type: 'category',
            owner_id: ownerId,
            request_key: requestKey,
            attempt_token: cleanupAttemptToken,
            reason: 'legacy-category-replaced',
            references: replaced.filter(Boolean),
          },
          session,
        );
        return updated;
      },
      readCommittedOwner: () =>
        this.categoryModel.findById(ownerId).read('primary').lean(),
    });
    return this.surfaceMediaCleanup(
      saved,
      requestKey,
      'CATEGORY_MEDIA_CLEANUP_PENDING',
    );
  }

  async updateUser(id: string, mobile: string) {
    const userId = requireObjectId(id);
    const normalizedMobile = mobile.trim();
    const userMobile = await this.userModel
      .findOne({ mobile: normalizedMobile })
      .lean();
    if (userMobile?._id && String(userMobile._id) !== String(userId)) {
      throw new HttpException({ message: 'Mobile number already in use' }, 400);
    }
    return this.userModel
      .findByIdAndUpdate(userId, { mobile: normalizedMobile }, { new: true })
      .exec();
  }

  /**
   * Admin detail for a MyCashBack profile.
   *
   * The users table navigates with the **UserMyCashback** `_id`. Older call
   * sites still pass an app **User** `_id`. Resolve MyCashback first, then fall
   * back to the User-linked lookup. Always return an array (admin mock + UI
   * contract). Never surface `UnauthorizedException` — the admin axios client
   * treats any HTTP 401 as session expiry and redirects to `/signin`.
   */
  async getMyCashBackUser(id: string) {
    const trimmed = String(id ?? '').trim();
    if (/^[0-9a-f]{24}$/i.test(trimmed)) {
      const row = await this.userMyCashbackModel
        .findById(trimmed)
        .select('-withdrawalPassword')
        .lean()
        .exec();
      if (row) {
        return [row];
      }
    }

    try {
      const myCashBack = await this.userService.getBalanceMyCashback(trimmed);
      const rows = myCashBack?.userMyCashback;
      if (Array.isArray(rows)) {
        return rows;
      }
      if (rows) {
        return [rows];
      }
      return [];
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Paginated MyCashBack user directory for the admin table.
   * Contract matches admin mock `POST|GET /admin/list-mycashback-users`.
   */
  async listMyCashbackUsers(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
      status?: string;
    } = {},
  ) {
    const page = Math.min(
      MYCASHBACK_USERS_MAX_PAGE,
      Math.max(1, Number(params.page) || 1),
    );
    const limit = Math.min(
      MYCASHBACK_USERS_MAX_LIMIT,
      Math.max(1, Number(params.limit) || MYCASHBACK_USERS_DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;
    const search = String(params.search ?? '')
      .trim()
      .slice(0, MYCASHBACK_USERS_MAX_SEARCH_LENGTH);
    const status = String(params.status ?? '').trim();
    const rawSort = String(params.sort ?? 'newest').trim() || 'newest';
    const sortKey = (MYCASHBACK_USER_SORTS as readonly string[]).includes(
      rawSort,
    )
      ? (rawSort as MyCashbackUserSort)
      : 'newest';

    const query = this.buildMyCashbackUsersQuery(search, status);

    // Balance sort sums every currency row (not FX-normalized). Primary-row
    // sort would under-rank multi-wallet users; aggregation is required.
    if (sortKey === 'balance') {
      const [data, total] = await Promise.all([
        this.userMyCashbackModel
          .aggregate([
            { $match: query },
            {
              $addFields: {
                _balanceTotal: {
                  $sum: {
                    $map: {
                      input: { $ifNull: ['$balance', []] },
                      as: 'b',
                      in: { $ifNull: ['$$b.amount', 0] },
                    },
                  },
                },
              },
            },
            { $sort: { _balanceTotal: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                withdrawalPassword: 0,
                buyerToken: 0,
                _balanceTotal: 0,
              },
            },
          ])
          .exec(),
        this.userMyCashbackModel.countDocuments(query).exec(),
      ]);

      return {
        status: 'success',
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    let sort: Record<string, 1 | -1>;
    switch (sortKey) {
      case 'name':
        sort = { firstName: 1, lastName: 1, email: 1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
        break;
    }

    const [data, total] = await Promise.all([
      this.userMyCashbackModel
        .find(query)
        .select('-withdrawalPassword -buyerToken')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userMyCashbackModel.countDocuments(query).exec(),
    ]);

    // Match findAll / mock paginate: empty result sets report totalPages 0.
    return {
      status: 'success',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildMyCashbackUsersQuery(
    search: string,
    status: string,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    if (search) {
      const safe = escapeRegexLiteral(search);
      const or: Record<string, unknown>[] = [
        { email: { $regex: safe, $options: 'i' } },
        { phoneNumber: { $regex: safe, $options: 'i' } },
        { buyerId: { $regex: safe, $options: 'i' } },
        { firstName: { $regex: safe, $options: 'i' } },
        { lastName: { $regex: safe, $options: 'i' } },
      ];
      // Exact 24-char hex only — Types.ObjectId.isValid also accepts any
      // 12-char string, which would wrongly coerce free-text searches.
      if (/^[0-9a-f]{24}$/i.test(search)) {
        const objectId = new Types.ObjectId(search);
        or.push({ _id: objectId }, { publisherId: objectId });
      }
      query.$or = or;
    }
    if (status === 'active') {
      // Treat missing `banned` as active (legacy rows).
      query.banned = { $ne: true };
    } else if (status === 'banned') {
      query.banned = true;
    }
    return query;
  }

  private async updateBanner(
    updateData: UpdateBannerHomeDto,
    model: Model<Banner>,
    mediaFolder: (typeof MEDIA_FOLDER)[keyof typeof MEDIA_FOLDER],
    successMessage: string,
    options: {
      fallbackModel?: Model<Banner>;
      deferMediaCleanup?: boolean;
      filter?: Record<string, unknown>;
      identity?: Record<string, unknown>;
      slotCount?: 3 | 5;
    } = {},
  ) {
    const filter = options.filter ?? {};
    const slotCount = options.slotCount ?? 5;
    let data = await model.findOne(filter).exec();
    const fallbackData = options.fallbackModel
      ? await options.fallbackModel.findOne().exec()
      : null;
    if (!data && fallbackData) {
      data = fallbackData;
    }
    const current = (data ?? {}) as Record<string, any>;
    const fallbackMedia = new Set<string>();
    if (fallbackData) {
      const fallback = fallbackData as unknown as Record<string, unknown>;
      for (let slot = 1; slot <= 5; slot += 1) {
        const reference = fallback[`image_${slot}`];
        if (typeof reference === 'string' && reference) {
          fallbackMedia.add(reference);
        }
      }
    }
    const stagedUploads: string[] = [];
    const replacedMedia = new Set<string>();
    const cleanupMedia = async (refs: Iterable<string>) => {
      await Promise.allSettled(
        Array.from(refs, (ref) => this.storedMediaService.deleteStored(ref)),
      );
    };

    const imageUpdates: Record<string, string | null> = {};
    for (let slot = 1; slot <= slotCount; slot += 1) {
      const imageKey = `image_${slot}` as const;
      const clearFlag =
        updateData[`clear_image_${slot}` as keyof UpdateBannerHomeDto] === true;
      const existing = current[imageKey];
      const upload = updateData[imageKey as keyof UpdateBannerHomeDto];

      if (clearFlag) {
        if (existing && !fallbackMedia.has(String(existing))) {
          if (options.deferMediaCleanup) {
            replacedMedia.add(String(existing));
          } else {
            await this.storedMediaService.deleteStored(String(existing));
          }
        }
        imageUpdates[imageKey] = null;
        continue;
      }

      if (this.isMulterUploadFile(upload)) {
        if (options.deferMediaCleanup) {
          try {
            const stored = await this.storedMediaService.upload(
              upload,
              mediaFolder,
            );
            stagedUploads.push(stored);
            imageUpdates[imageKey] = stored;
            if (existing && !fallbackMedia.has(String(existing))) {
              replacedMedia.add(String(existing));
            }
          } catch (error) {
            await cleanupMedia(stagedUploads);
            throw error;
          }
        } else {
          imageUpdates[imageKey] = await this.storedMediaService.replace(
            upload,
            mediaFolder,
            existing,
          );
        }
        continue;
      }

      if (existing !== undefined) {
        imageUpdates[imageKey] = existing;
      }
    }

    const resolveSlotLink = (value: unknown, existing: unknown) => {
      if (value === undefined || value === null) {
        return typeof existing === 'string' ? existing : '';
      }
      return String(value);
    };

    const payload: Record<string, any> = {
      ...(options.identity ?? {}),
      ...imageUpdates,
      link_1: resolveSlotLink(updateData.link_1, current.link_1),
      link_2: resolveSlotLink(updateData.link_2, current.link_2),
      link_3: resolveSlotLink(updateData.link_3, current.link_3),
      link_4: resolveSlotLink(updateData.link_4, current.link_4),
      link_5: resolveSlotLink(updateData.link_5, current.link_5),
      // preserve legacy schedule window if present on the old schema.
      start_date: current.start_date,
      end_date: current.end_date,
      // Persist the per-slot controls used by schedule/switch mechanics.
      enabled_1:
        updateData.enabled_1 === undefined
          ? current.enabled_1
          : updateData.enabled_1,
      enabled_2:
        updateData.enabled_2 === undefined
          ? current.enabled_2
          : updateData.enabled_2,
      enabled_3:
        updateData.enabled_3 === undefined
          ? current.enabled_3
          : updateData.enabled_3,
      enabled_4:
        updateData.enabled_4 === undefined
          ? current.enabled_4
          : updateData.enabled_4,
      enabled_5:
        updateData.enabled_5 === undefined
          ? current.enabled_5
          : updateData.enabled_5,
      start_date_1:
        updateData.start_date_1 === undefined
          ? current.start_date_1
          : updateData.start_date_1,
      start_date_2:
        updateData.start_date_2 === undefined
          ? current.start_date_2
          : updateData.start_date_2,
      start_date_3:
        updateData.start_date_3 === undefined
          ? current.start_date_3
          : updateData.start_date_3,
      start_date_4:
        updateData.start_date_4 === undefined
          ? current.start_date_4
          : updateData.start_date_4,
      start_date_5:
        updateData.start_date_5 === undefined
          ? current.start_date_5
          : updateData.start_date_5,
      end_date_1:
        updateData.end_date_1 === undefined
          ? current.end_date_1
          : updateData.end_date_1,
      end_date_2:
        updateData.end_date_2 === undefined
          ? current.end_date_2
          : updateData.end_date_2,
      end_date_3:
        updateData.end_date_3 === undefined
          ? current.end_date_3
          : updateData.end_date_3,
      end_date_4:
        updateData.end_date_4 === undefined
          ? current.end_date_4
          : updateData.end_date_4,
      end_date_5:
        updateData.end_date_5 === undefined
          ? current.end_date_5
          : updateData.end_date_5,
    };

    // Page-specific carousels have exactly three visible slots. Strip hidden
    // legacy home positions even when callers bypass the HTTP DTO.
    for (let slot = slotCount + 1; slot <= 5; slot += 1) {
      delete payload[`image_${slot}`];
      delete payload[`link_${slot}`];
      delete payload[`enabled_${slot}`];
      delete payload[`start_date_${slot}`];
      delete payload[`end_date_${slot}`];
    }

    try {
      await model
        .findOneAndUpdate(
          filter,
          { $set: payload },
          { upsert: true, new: true },
        )
        .exec();
    } catch (error) {
      if (options.deferMediaCleanup) {
        await cleanupMedia(stagedUploads);
      }
      throw error;
    }
    if (options.deferMediaCleanup) {
      await cleanupMedia(replacedMedia);
    }
    return { message: successMessage };
  }

  updateBannerHome(updateData: UpdateBannerHomeDto) {
    return this.updateBanner(
      updateData,
      this.bannerModel,
      MEDIA_FOLDER.BANNER_HOME,
      'Update banner home success',
    );
  }

  updateAllBrandBanner(updateData: UpdateBannerHomeDto) {
    return this.updateSpecificPageBanner('all-brands', updateData);
  }

  async updateSpecificPageBanner(
    targetValue: string,
    updateData: UpdateSpecificPageBannerDto | UpdateBannerHomeDto,
  ) {
    const target = requireSpecificPageBannerTarget(targetValue);
    return this.updateBanner(
      updateData,
      this.specificPageBannerModel,
      MEDIA_FOLDER.BANNER_SPECIFIC_PAGE,
      `Update ${target} specific page banner success`,
      {
        deferMediaCleanup: true,
        fallbackModel:
          target === 'all-brands' ? this.allBrandBannerModel : undefined,
        filter: { target },
        identity: { target },
        slotCount: 3,
      },
    );
  }

  async getBannerHome() {
    return this.bannerModel.findOne().exec();
  }

  async getAllBrandBanner() {
    return this.getSpecificPageBanner('all-brands');
  }

  async getSpecificPageBanner(targetValue: string) {
    const target = requireSpecificPageBannerTarget(targetValue);
    const banner = await this.specificPageBannerModel
      .findOne({ target })
      .exec();
    if (banner || target !== 'all-brands') {
      return banner;
    }
    return this.allBrandBannerModel.findOne().exec();
  }

  async streamStoredMedia(stored: string) {
    return this.storedMediaService.getReadableStream(stored);
  }

  async updateConversionDataByConversionId(id: string) {
    return this.jobService.syncConversionByConversionId(id);
  }

  async getDeepLinkList() {
    return this.deeplinkModel.aggregate([
      {
        // offer_id is unique only WITHIN a source; key the join off the
        // deeplink's own source (defaulted to 'involve') so a same-id offer
        // from another network can't be $unwind-joined. For Involve-only data
        // $$src === 'involve' — byte-identical to the previous behaviour.
        $lookup: {
          from: 'offers',
          let: {
            oid: '$offer_id',
            src: { $ifNull: ['$source', 'involve'] },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $ifNull: ['$source', 'involve'] }, '$$src'] },
                    { $eq: ['$offer_id', '$$oid'] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'offer',
        },
      },
      { $unwind: '$offer' },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ]);
  }

  /** Return conversions manually created by admins (quest rewards). */
  async getCreatedConversions(limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const query = { offer_name: 'reward_conversion_quest' };

    const [data, total] = await Promise.all([
      this.conversionModel
        .find(query)
        .sort({ datetime_conversion: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.conversionModel.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Saved homepage top-brand config for the admin editor. */
  async getTopBrands() {
    const config = await this.topBrandConfigModel.findOne().lean().exec();
    const brandsDesktop = resolveDeviceBrandEntries(config, 'desktop');
    const brandsMobile = resolveDeviceBrandEntries(config, 'mobile');
    const orderDesktop = brandsDesktop.map((entry) => entry.offerId);
    const orderMobile = brandsMobile.map((entry) => entry.offerId);
    const order = orderDesktop;
    const unionIds = [...new Set([...orderDesktop, ...orderMobile])];

    if (unionIds.length === 0) {
      return {
        order: [],
        orderDesktop: [],
        orderMobile: [],
        brands: [],
        brandsDesktop: [],
        brandsMobile: [],
        items: [],
        maxBrands: MAX_TOP_BRANDS,
      };
    }

    const offers = await this.offerModel
      .find({ _id: { $in: unionIds } })
      .exec();
    const offerById = new Map(
      offers.map((offer) => [String(offer._id), offer]),
    );

    const withLiveCashback = (
      entries: { offerId: string; cashback: string }[],
    ) =>
      entries.map((entry) => ({
        ...entry,
        cashback: resolveOfferCashbackLabel(offerById.get(entry.offerId)),
      }));

    const liveDesktop = withLiveCashback(brandsDesktop);
    const liveMobile = withLiveCashback(brandsMobile);

    return {
      order,
      orderDesktop,
      orderMobile,
      brands: liveDesktop,
      brandsDesktop: liveDesktop,
      brandsMobile: liveMobile,
      items: unionIds
        .map((offerId) => offerById.get(offerId))
        .filter((offer) => offer != null),
      maxBrands: MAX_TOP_BRANDS,
    };
  }

  /**
   * Save admin-curated top-brands as ordered offer identities.
   * Legacy `{ brands }` writes the same list to all three fields.
   * Phase 2 `{ brandsDesktop, brandsMobile }` persists independent orders
   * and mirrors desktop into legacy `brands` for older readers.
   */
  async saveTopBrands(
    input:
      | { offerId: string; cashback: string }[]
      | SaveTopBrandsDto
      | null
      | undefined,
  ) {
    const body = Array.isArray(input) ? { brands: input } : (input ?? {});
    const hasDeviceLists =
      body.brandsDesktop !== undefined || body.brandsMobile !== undefined;

    if (hasDeviceLists) {
      if (
        (body.brandsDesktop?.length ?? 0) > MAX_TOP_BRANDS ||
        (body.brandsMobile?.length ?? 0) > MAX_TOP_BRANDS
      ) {
        throw new BadRequestException(
          `Top brands is limited to ${MAX_TOP_BRANDS} offers.`,
        );
      }
      const brandsDesktop = normalizeTopBrandEntries(
        body.brandsDesktop ?? body.brands,
      );
      const brandsMobile = normalizeTopBrandEntries(
        body.brandsMobile ?? body.brands,
      );
      await this.assertTopBrandOffersEligible(
        topBrandMemberIds(brandsDesktop, brandsMobile),
      );
      await this.topBrandConfigModel.updateOne(
        {},
        {
          $set: {
            brands: brandsDesktop,
            brandsDesktop,
            brandsMobile,
          },
        },
        { upsert: true },
      );
      await mirrorTopBrandExtraStoreFlags(
        this.offerModel,
        topBrandMemberIds(brandsDesktop, brandsMobile),
      );
      return {
        success: true,
        brands: brandsDesktop,
        brandsDesktop,
        brandsMobile,
      };
    }

    const normalizedBrands = normalizeTopBrandEntries(body.brands);
    if ((body.brands?.length ?? 0) > MAX_TOP_BRANDS) {
      throw new BadRequestException(
        `Top brands is limited to ${MAX_TOP_BRANDS} offers.`,
      );
    }
    await this.assertTopBrandOffersEligible(
      topBrandMemberIds(normalizedBrands, normalizedBrands),
    );

    await this.topBrandConfigModel.updateOne(
      {},
      {
        $set: {
          brands: normalizedBrands,
          brandsDesktop: normalizedBrands,
          brandsMobile: normalizedBrands,
        },
      },
      { upsert: true },
    );
    await mirrorTopBrandExtraStoreFlags(
      this.offerModel,
      topBrandMemberIds(normalizedBrands, normalizedBrands),
    );
    return {
      success: true,
      brands: normalizedBrands,
      brandsDesktop: normalizedBrands,
      brandsMobile: normalizedBrands,
    };
  }

  /**
   * Approve an offer for display on the customer app. Clears any prior
   * rejection reason so an un-reject / re-approve cycle leaves a clean record.
   */
  async approveOffer(offerId: string, adminId: string) {
    if (!Types.ObjectId.isValid(offerId)) {
      throw new HttpException('Invalid offer id', 400);
    }
    const updated = await this.offerModel
      .findByIdAndUpdate(
        offerId,
        {
          $set: {
            status: 'approved',
            reviewed_by: adminId,
            reviewed_at: new Date(),
          },
          $unset: { rejection_reason: '' },
        },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new HttpException('Offer not found', 404);
    }
    return updated;
  }

  /** Reject an offer. Reason is required for audit and is surfaced on the detail view. */
  async rejectOffer(offerId: string, adminId: string, reason: string) {
    if (!Types.ObjectId.isValid(offerId)) {
      throw new HttpException('Invalid offer id', 400);
    }
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new HttpException('Rejection reason is required', 400);
    }
    const updated = await this.offerModel
      .findByIdAndUpdate(
        offerId,
        {
          $set: {
            status: 'rejected',
            reviewed_by: adminId,
            reviewed_at: new Date(),
            rejection_reason: trimmed,
          },
        },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new HttpException('Offer not found', 404);
    }
    return updated;
  }

  private buildConversionListFilter(
    search?: string,
    key?: string,
    status?: string,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (search && key) {
      const searchKey = requireOneOf(
        key,
        [
          'aff_sub1',
          'conversion_id',
          'adv_sub1',
          'adv_sub2',
          'adv_sub3',
          'adv_sub4',
        ] as const,
        'search key',
      );
      if (searchKey === 'conversion_id') {
        filter.conversion_id = mongoEq(
          requireTrimmedString(search, 200, 'conversion id'),
        );
      } else {
        filter.$or = [
          {
            [searchKey]: mongoCaseInsensitiveRegex(search),
          },
        ];
      }
    }
    if (status) {
      filter.conversion_status = mongoCaseInsensitiveRegex(status);
    }
    return mongoFilter(filter);
  }

  private isMulterUploadFile(value: unknown): value is Express.Multer.File {
    if (value == null || typeof value !== 'object') {
      return false;
    }
    return 'buffer' in value || 'path' in value;
  }
}
