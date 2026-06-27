import { HttpException, Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import {
  ProductTypeDto,
  UpdateAdminDto,
  UpdateBannerHomeDto,
  UpdateFeeRateDto,
  UpdateRequestWithdrawDto,
} from './dto/update-admin.dto';
import { InjectModel } from '@nestjs/mongoose';
import { UserAdmin } from './user-admin/schemas/user-admin.schema';
import { Model, Types } from 'mongoose';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';
import { InvolveService } from 'src/involve/involve.service';
import { User } from 'src/user/schemas/user.schema';
import { FeeRate } from 'src/withdraw/schemas/feeRate.schema';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import { Offer } from 'src/offer/schemas/offer.schema';
import { Category } from 'src/offer/schemas/category.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { Banner } from 'src/offer/schemas/banner.schema';
import { TopBrandConfig } from 'src/offer/schemas/top-brand-config.schema';
import { UserService } from 'src/user/user.service';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import {
  mongoCaseInsensitiveRegex,
  mongoEq,
  mongoFilter,
  mongoSetUpdate,
  requireFiniteNumber,
  requireObjectId,
  requireOneOf,
  requireTrimmedString,
} from 'src/common/mongo-query';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserAdmin.name) private userAdminModel: Model<UserAdmin>,
    @InjectModel(Withdraw.name) private withdrawModel: Model<Withdraw>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(UserMyCashback.name)
    private userMyCashbackModel: Model<UserMyCashback>,
    @InjectModel(Banner.name) private bannerModel: Model<Banner>,
    @InjectModel(TopBrandConfig.name)
    private topBrandConfigModel: Model<TopBrandConfig>,
    @InjectModel(Deeplink.name) private deeplinkModel: Model<Deeplink>,

    private readonly googleDriveService: GoogleDriveService,
    private involveService: InvolveService,
    private userService: UserService,
    private readonly jobService: JobService,
  ) {}
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

  update(id: string, updateAdminDto: UpdateAdminDto) {
    return this.userAdminModel
      .findByIdAndUpdate(
        requireObjectId(id),
        mongoSetUpdate(updateAdminDto as Record<string, unknown>),
      )
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
    if (file) {
      const res = await this.googleDriveService.uploadFile(file);
      return this.withdrawModel
        .findByIdAndUpdate(
          withdrawId,
          mongoSetUpdate({
            status: requireTrimmedString(
              updateRequestWithdrawDto.status,
              64,
              'withdraw status',
            ),
            slip_file: res.id,
          }),
        )
        .exec();
    }
    return this.withdrawModel
      .findByIdAndUpdate(
        withdrawId,
        mongoSetUpdate({
          status: requireTrimmedString(
            updateRequestWithdrawDto.status,
            64,
            'withdraw status',
          ),
        }),
      )
      .exec();
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

    const skip = (page - 1) * limit;

    const allConversions = await this.conversionModel
      .aggregate([
        {
          $match: mongoFilter(filter),
        },
        {
          $lookup: {
            from: 'offers',
            localField: 'offer_id',
            foreignField: 'offer_id',
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
      this.conversionModel.countDocuments(mongoFilter(filter)).exec(),
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
    // return this.involveService.getConversionAll(
    //   { page: 1, limit: 10 },
    //   { conversion_id: body?.join('|') },
    // );
    return this.conversionModel
      .find(
        mongoFilter({
          conversion_id: {
            $in: body.map((id) => requireFiniteNumber(id, 'conversion id')),
          },
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
    const feeRate = await this.feeRateModel.findOne({ _id: objectId }).exec();
    if (feeRate) {
      return this.feeRateModel
        .findOneAndUpdate(
          { _id: objectId },
          mongoSetUpdate(this.buildFeeRateUpdate(updateFeeRateDto)),
          {
            upsert: true,
            new: true,
          },
        )
        .exec();
    }
    const newFeeRate = new this.feeRateModel(updateFeeRateDto);
    return newFeeRate.save();
  }

  async updateOffer(
    id: string,
    updateData: {
      logo_desktop?: Express.Multer.File;
      logo_mobile?: Express.Multer.File;
      banner?: Express.Multer.File;
      banner_mobile?: Express.Multer.File;
      logo_circle?: Express.Multer.File;
      offer_name_display?: string;
      disabled?: boolean;
      commission_store?: number;
      max_cap?: number;
      extra_store?: boolean;
      tracking_link?: string;
      product_type: ProductTypeDto[];
    },
  ) {
    const offer = await this.offerModel.findById(requireObjectId(id)).exec();
    if (!offer) {
      throw new Error('Offer not found');
    }
    const folderId = '1CliPCEtpvH8e8--EflAZ6NdCMuBSddpR';
    let file1;
    if (updateData.logo_desktop) {
      file1 = await this.googleDriveService.uploadFile(
        updateData.logo_desktop,
        folderId,
      );
      if (offer.logo_desktop) {
        await this.googleDriveService.deleteFile(offer.logo_desktop);
      }
    }
    let file2;
    if (updateData.logo_mobile) {
      file2 = await this.googleDriveService.uploadFile(
        updateData.logo_mobile,
        folderId,
      );
      if (offer.logo_mobile) {
        await this.googleDriveService.deleteFile(offer.logo_mobile);
      }
    }

    let bannerFile;
    if (updateData.banner) {
      bannerFile = await this.googleDriveService.uploadFile(
        updateData.banner,
        folderId,
      );
      if (offer.banner) {
        await this.googleDriveService.deleteFile(offer.banner);
      }
    }

    let bannerMobileFile;
    if (updateData.banner_mobile) {
      bannerMobileFile = await this.googleDriveService.uploadFile(
        updateData.banner_mobile,
        folderId,
      );
      if (offer.banner_mobile) {
        await this.googleDriveService.deleteFile(offer.banner_mobile);
      }
    }

    let logoCircleFile;
    if (updateData.logo_circle) {
      logoCircleFile = await this.googleDriveService.uploadFile(
        updateData.logo_circle,
        folderId,
      );
      if (offer.logo_circle) {
        await this.googleDriveService.deleteFile(offer.logo_circle);
      }
    }
    const trackingLink =
      typeof updateData.tracking_link === 'string' &&
      updateData.tracking_link.trim()
        ? updateData.tracking_link.trim()
        : offer.tracking_link;
    return this.offerModel
      .findByIdAndUpdate(
        requireObjectId(id),
        mongoSetUpdate({
          logo_desktop: file1 ? file1.id : offer.logo_desktop,
          logo_mobile: file2 ? file2.id : offer.logo_mobile,
          banner: bannerFile ? bannerFile.id : offer.banner,
          banner_mobile: bannerMobileFile
            ? bannerMobileFile.id
            : offer.banner_mobile,
          logo_circle: logoCircleFile ? logoCircleFile.id : offer.logo_circle,
          offer_name_display:
            updateData.offer_name_display ?? offer.offer_name_display,
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
        }),
        { new: true },
      )
      .exec();
  }

  async updateCategory(
    id: string,
    updateData: {
      image?: Express.Multer.File;
    },
  ) {
    const data = await this.categoryModel.findById(id).exec();
    if (!data) {
      throw new Error('data not found');
    }
    const folderId = '1Liu0dk5mo5cnGnFKJWOpnvV6eBHV_sii';
    let file1;
    if (updateData.image) {
      file1 = await this.googleDriveService.uploadFile(
        updateData.image,
        folderId,
      );
      if (data.image) {
        await this.googleDriveService.deleteFile(data.image);
      }
    }
    return this.categoryModel
      .findByIdAndUpdate(
        requireObjectId(id),
        {
          ...updateData,
          image: file1 ? file1.id : data.image,
        },
        { new: true },
      )
      .exec();
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

  async updateBannerHome(updateData: UpdateBannerHomeDto) {
    // logic update banner home
    const data = (await this.bannerModel.findOne().exec()) ?? {};

    const current = data as Record<string, any>;

    const folderId = '16AmK8RlgEYa16LbPYEgtGBL4U1ouDhiS';
    let file1;
    if (updateData.image_1) {
      file1 = await this.googleDriveService.uploadFile(
        updateData.image_1 as unknown as Express.Multer.File,
        folderId,
      );
      if (current.image_1) {
        await this.googleDriveService.deleteFile(current.image_1);
      }
    }
    let file2;
    if (updateData.image_2) {
      file2 = await this.googleDriveService.uploadFile(
        updateData.image_2 as unknown as Express.Multer.File,
        folderId,
      );
      if (current.image_2) {
        await this.googleDriveService.deleteFile(current.image_2);
      }
    }

    let file3;
    if (updateData.image_3) {
      file3 = await this.googleDriveService.uploadFile(
        updateData.image_3 as unknown as Express.Multer.File,
        folderId,
      );
      if (current.image_3) {
        await this.googleDriveService.deleteFile(current.image_3);
      }
    }
    let file4;
    if (updateData.image_4) {
      file4 = await this.googleDriveService.uploadFile(
        updateData.image_4 as unknown as Express.Multer.File,
        folderId,
      );
      if (current.image_4) {
        await this.googleDriveService.deleteFile(current.image_4);
      }
    }

    let file5;
    if (updateData.image_5) {
      file5 = await this.googleDriveService.uploadFile(
        updateData.image_5 as unknown as Express.Multer.File,
        folderId,
      );
      if (current.image_5) {
        await this.googleDriveService.deleteFile(current.image_5);
      }
    }

    const resolveSlotLink = (value: unknown, existing: unknown) => {
      if (value === undefined || value === null) {
        return typeof existing === 'string' ? existing : '';
      }
      return String(value);
    };

    const payload: Record<string, any> = {
      image_1: file1 ? file1.id : current.image_1,
      image_2: file2 ? file2.id : current.image_2,
      image_3: file3 ? file3.id : current.image_3,
      image_4: file4 ? file4.id : current.image_4,
      image_5: file5 ? file5.id : current.image_5,
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

    await this.bannerModel
      .findOneAndUpdate({}, { $set: payload }, { upsert: true, new: true })
      .exec();
    return { message: 'Update banner home success' };
  }

  async getBannerHome() {
    // logic get banner home
    return this.bannerModel.findOne().exec();
  }

  async updateConversionDataByConversionId(id: string) {
    return this.jobService.syncConversionByConversionId(id);
  }

  async getDeepLinkList() {
    return this.deeplinkModel.aggregate([
      {
        $lookup: {
          from: 'offers',
          localField: 'offer_id',
          foreignField: 'offer_id',
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
      .map((entry) => ({
        offerId: String(entry.offerId ?? '').trim(),
        cashback: String(entry.cashback ?? '').trim(),
      }))
      .filter((entry) => entry.offerId);

    if (brands.length === 0) {
      return { order: [], brands: [], items: [] };
    }

    const order = brands.map((entry) => entry.offerId);
    const offers = await this.offerModel.find({ _id: { $in: order } }).exec();
    const offerById = new Map(
      offers.map((offer) => [String(offer._id), offer]),
    );

    return {
      order,
      brands,
      items: order
        .map((offerId) => offerById.get(offerId))
        .filter((offer) => offer != null),
    };
  }

  /**
   * Save the admin-curated top-brands list: an ordered set of offer ids, each
   * with an admin-typed cashback label. Stored as a single config doc (empty
   * filter = the singleton) in its own collection, so it never collides with
   * the image-banner doc that OfferService.getBannerHome() reads.
   */
  async saveTopBrands(brands: { offerId: string; cashback: string }[]) {
    const seen = new Set<string>();
    const normalizedBrands = (brands ?? [])
      .map((entry) => ({
        offerId: String(entry.offerId ?? '').trim(),
        cashback: String(entry.cashback ?? '').trim(),
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

  private buildFeeRateUpdate(dto: UpdateFeeRateDto): Record<string, number> {
    const fields: Record<string, number> = {};
    const entries: Array<[keyof UpdateFeeRateDto, string]> = [
      ['system', 'system fee'],
      ['store', 'store fee'],
      ['minimum_withdraw', 'minimum withdraw'],
      ['minimum_withdraw_thb', 'minimum withdraw thb'],
      ['minimum_withdraw_usd', 'minimum withdraw usd'],
      ['fee_withdraw_thb', 'fee withdraw thb'],
      ['fee_withdraw_usd', 'fee withdraw usd'],
    ];
    for (const [key, label] of entries) {
      const value = dto[key];
      if (value !== undefined && value !== null) {
        fields[key] = requireFiniteNumber(value, label);
      }
    }
    return fields;
  }
}
