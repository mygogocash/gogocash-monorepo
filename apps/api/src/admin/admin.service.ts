import {
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateAdminDto } from './dto/create-admin.dto';
import {
  ProductTypeDto,
  UpdateAdminDto,
  UpdateBannerHomeDto,
  UpdateSpecificPageBannerDto,
  UpdateFeeRateDto,
  UpdateRequestWithdrawDto,
} from './dto/update-admin.dto';
import { InjectModel } from '@nestjs/mongoose';
import { UserAdmin } from './user-admin/schemas/user-admin.schema';
import { Model, Types } from 'mongoose';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';
import { WithdrawFeeCoupon } from 'src/withdraw/schemas/withdraw-fee-coupon.schema';
import { WithdrawFeeCouponRedemption } from 'src/withdraw/schemas/withdraw-fee-coupon-redemption.schema';
import { shouldRestoreWithdrawFeeCoupon } from './restore-withdraw-fee-coupon';
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
  resolveOfferCashbackLabel,
} from 'src/offer/top-brand.contract';
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
  product_type: ProductTypeDto[];
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

type AdminCategoryUpdateData = {
  name?: string;
  image?: Express.Multer.File;
  banner?: Express.Multer.File;
};

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
      this.userAdminModel.find(query).skip(skip).limit(limit).exec(),
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
    return this.userAdminModel.findById(requireObjectId(id)).exec();
  }

  update(id: string, _updateAdminDto: UpdateAdminDto) {
    void _updateAdminDto;
    return this.userAdminModel
      .findByIdAndUpdate(requireObjectId(id), mongoSetUpdate({}))
      .exec();
  }

  async updateRequestWithdraw(
    updateRequestWithdrawDto: UpdateRequestWithdrawDto,
    file: Express.Multer.File,
  ) {
    const withdrawId = requireObjectId(
      updateRequestWithdrawDto.id,
      'withdraw id',
    );
    const nextStatus = requireTrimmedString(
      updateRequestWithdrawDto.status,
      64,
      'withdraw status',
    );
    const existing = await this.withdrawModel.findById(withdrawId).exec();

    let updated;
    if (file) {
      const slipFile = await this.storedMediaService.upload(
        file,
        MEDIA_FOLDER.WITHDRAW_SLIPS,
      );
      updated = await this.withdrawModel
        .findByIdAndUpdate(
          withdrawId,
          mongoSetUpdate({
            status: nextStatus,
            slip_file: slipFile,
          }),
        )
        .exec();
    } else {
      updated = await this.withdrawModel
        .findByIdAndUpdate(
          withdrawId,
          mongoSetUpdate({
            status: nextStatus,
          }),
        )
        .exec();
    }

    if (
      shouldRestoreWithdrawFeeCoupon({
        previousStatus: existing?.status,
        nextStatus,
        couponId: existing?.coupon_id,
      })
    ) {
      const redemption = await this.withdrawFeeCouponRedemptionModel
        .findOneAndDelete({ withdraw_id: withdrawId })
        .exec();
      if (redemption?.coupon_id) {
        await this.withdrawFeeCouponModel
          .updateOne(
            {
              _id: redemption.coupon_id,
              quantity_used: { $gt: 0 },
            },
            { $inc: { quantity_used: -1 } },
          )
          .exec();
      }
    }

    return updated;
  }

  remove(_id: string) {
    void _id;
    return null;
  }

  async getWithdrawAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const query = search
      ? {
          $or: [
            { method: { $regex: escapeRegexLiteral(search), $options: 'i' } },
            { status: { $regex: escapeRegexLiteral(search), $options: 'i' } },
            { address: { $regex: escapeRegexLiteral(search), $options: 'i' } },
          ],
        }
      : {};

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
    return this.categoryIntegrity.withNormalWrite({
      legacy: () => this.updateOfferLegacy(id, updateData),
      enforced: () => this.updateOfferWithIntegrity(id, updateData),
    });
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
          product_type:
            typeof updateData.product_type === 'string'
              ? JSON.parse(updateData.product_type)
              : updateData.product_type,
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
        product_type:
          typeof updateData.product_type === 'string'
            ? JSON.parse(updateData.product_type)
            : updateData.product_type,
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
    if (userMobile && userMobile._id.toString() !== userId.toString()) {
      throw new HttpException({ message: 'Mobile number already in use' }, 400);
    }
    return this.userModel
      .findByIdAndUpdate(userId, { mobile: normalizedMobile }, { new: true })
      .exec();
  }

  async getMyCashBackUser(id: string) {
    const myCashBack = await this.userService.getBalanceMyCashback(id);
    return myCashBack?.userMyCashback;
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
    const config = await this.topBrandConfigModel.findOne().exec();
    const brands = (config?.brands ?? [])
      .slice(0, MAX_TOP_BRANDS)
      .map((entry) => ({
        offerId: String(entry.offerId ?? '').trim(),
        cashback: '',
      }))
      .filter((entry) => entry.offerId);

    if (brands.length === 0) {
      return { order: [], brands: [], items: [], maxBrands: MAX_TOP_BRANDS };
    }

    const order = brands.map((entry) => entry.offerId);
    const offers = await this.offerModel.find({ _id: { $in: order } }).exec();
    const offerById = new Map(
      offers.map((offer) => [String(offer._id), offer]),
    );

    const liveBrands = brands.map((entry) => ({
      ...entry,
      cashback: resolveOfferCashbackLabel(offerById.get(entry.offerId)),
    }));

    return {
      order,
      brands: liveBrands,
      items: order
        .map((offerId) => offerById.get(offerId))
        .filter((offer) => offer != null),
      maxBrands: MAX_TOP_BRANDS,
    };
  }

  /**
   * Save the admin-curated top-brands list as ordered offer identities. The
   * cashback label is derived from each live offer when read. Stored as a
   * single config doc (empty
   * filter = the singleton) in its own collection, so it never collides with
   * the image-banner doc that OfferService.getBannerHome() reads.
   */
  async saveTopBrands(brands: { offerId: string; cashback: string }[]) {
    if ((brands?.length ?? 0) > MAX_TOP_BRANDS) {
      throw new BadRequestException(
        `Top brands is limited to ${MAX_TOP_BRANDS} offers.`,
      );
    }

    const seen = new Set<string>();
    const normalizedBrands = (brands ?? [])
      .map((entry) => ({
        offerId: String(entry.offerId ?? '').trim(),
        cashback: '',
      }))
      .filter((entry) => {
        if (!entry.offerId || seen.has(entry.offerId)) {
          return false;
        }
        seen.add(entry.offerId);
        return true;
      });

    await this.topBrandConfigModel.updateOne(
      {},
      { $set: { brands: normalizedBrands } },
      { upsert: true },
    );
    return { success: true, brands: normalizedBrands };
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
