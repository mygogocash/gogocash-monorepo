/* eslint-disable prettier/prettier */
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
import { UserService } from 'src/user/user.service';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';

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
    @InjectModel(Deeplink.name) private deeplinkModel: Model<Deeplink>,

    private readonly googleDriveService: GoogleDriveService,
    private involveService: InvolveService,
    private userService: UserService,
    private readonly jobService: JobService,
  ) {}
  create(createAdminDto: CreateAdminDto) {
    console.log(createAdminDto);
    return 'This action adds a new admin';
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
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
    return this.userAdminModel.findById(id).exec();
  }

  update(id: string, updateAdminDto: UpdateAdminDto) {
    return this.userAdminModel.findByIdAndUpdate(id, updateAdminDto).exec();
  }

  async updateRequestWithdraw(
    updateRequestWithdrawDto: UpdateRequestWithdrawDto,
    file: Express.Multer.File,
  ) {
    if (file) {
      const res = await this.googleDriveService.uploadFile(file);
      return this.withdrawModel
        .findByIdAndUpdate(new Types.ObjectId(updateRequestWithdrawDto.id), {
          status: updateRequestWithdrawDto.status,
          slip_file: res.id,
        })
        .exec();
    }
    return this.withdrawModel
      .findByIdAndUpdate(new Types.ObjectId(updateRequestWithdrawDto.id), {
        status: updateRequestWithdrawDto.status,
      })
      .exec();
  }

  remove(id: string) {
    console.log('remove admin id:', id);
    // this.userAdminModel.findByIdAndDelete(id).exec();
    return null;
  }

  async getWithdrawAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const query = search
      ? {
          $or: [
            { method: { $regex: search, $options: 'i' } },
            { status: { $regex: search, $options: 'i' } },
            { address: { $regex: search, $options: 'i' } },
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
    const filter = {};
    if (search && key) {
      if (key === 'conversion_id') {
        filter['$or'] = [
          { conversion_id: search },
          // { aff_sub1: { $regex: search, $options: 'i' } },
          // { offer_name: { $regex: search, $options: 'i' } },
          // { adv_sub1: { $regex: search, $options: 'i' } },
          // { adv_sub2: { $regex: search, $options: 'i' } },
          // { adv_sub3: { $regex: search, $options: 'i' } },
          // { adv_sub4: { $regex: search, $options: 'i' } },
          // { adv_sub5: { $regex: search, $options: 'i' } },
          // { conversion_id: { $regex: search, $options: 'i' } },
        ];
      } else {
        filter['$or'] = [
          { [key]: { $regex: search, $options: 'i' } },
          // { aff_sub1: { $regex: search, $options: 'i' } },
          // { offer_name: { $regex: search, $options: 'i' } },
          // { adv_sub1: { $regex: search, $options: 'i' } },
          // { adv_sub2: { $regex: search, $options: 'i' } },
          // { adv_sub3: { $regex: search, $options: 'i' } },
          // { adv_sub4: { $regex: search, $options: 'i' } },
          // { adv_sub5: { $regex: search, $options: 'i' } },
          // { conversion_id: { $regex: search, $options: 'i' } },
        ];
      }
    }

    if (status) {
      filter['conversion_status'] = { $regex: status, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.conversionModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ datetime_conversion: -1 })
        .exec(),
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
    // return this.involveService.getConversionAll(
    //   { page: 1, limit: 10 },
    //   { conversion_id: body?.join('|') },
    // );
    return this.conversionModel
      .find({ conversion_id: { $in: body } })
      .sort({ datetime_conversion: -1 })
      .lean();
  }

  async getFeeRate() {
    return this.feeRateModel.find().exec();
  }

  async updateFeeRate(updateFeeRateDto: UpdateFeeRateDto, id: string) {
    const feeRate = await this.feeRateModel.findOne({ _id: id }).exec();
    if (feeRate) {
      return this.feeRateModel
        .findOneAndUpdate({ _id: feeRate._id }, updateFeeRateDto, {
          upsert: true,
          new: true,
        })
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
      product_type: ProductTypeDto[];
    },
  ) {
    const offer = await this.offerModel.findById(id).exec();
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
    return this.offerModel
      .findByIdAndUpdate(
        id,
        {
          ...updateData,
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
          product_type: typeof updateData.product_type === 'string' ? JSON.parse(updateData.product_type) : updateData.product_type,
        },
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
        id,
        {
          ...updateData,
          image: file1 ? file1.id : data.image,
        },
        { new: true },
      )
      .exec();
  }

  async updateUser(id: string, mobile: string) {
    const userMobile = await this.userModel.findOne({ mobile }).lean();
    if (userMobile && userMobile._id.toString() !== id.toString()) {
      throw new HttpException({ message: 'Mobile number already in use' }, 400);
    }
    return this.userModel
      .findByIdAndUpdate(id, { mobile }, { new: true })
      .exec();
  }

  async getMyCashBackUser(id: string) {
    const myCashBack = await this.userService.getBalanceMyCashback(id);
    return myCashBack?.userMyCashback;
  }

  async updateBannerHome(updateData: UpdateBannerHomeDto) {
    // logic update banner home
    const data = await this.bannerModel.findOne().exec();

    const folderId = '16AmK8RlgEYa16LbPYEgtGBL4U1ouDhiS';
    let file1;
    if (updateData.image_1) {
      file1 = await this.googleDriveService.uploadFile(
        updateData.image_1 as unknown as Express.Multer.File,
        folderId,
      );
      if (data && data.image_1) {
        await this.googleDriveService.deleteFile(data.image_1);
      }
    }
    let file2;
    if (updateData.image_2) {
      file2 = await this.googleDriveService.uploadFile(
        updateData.image_2 as unknown as Express.Multer.File,
        folderId,
      );
      if (data && data.image_2) {
        await this.googleDriveService.deleteFile(data.image_2);
      }
    }

    let file3;
    if (updateData.image_3) {
      file3 = await this.googleDriveService.uploadFile(
        updateData.image_3 as unknown as Express.Multer.File,
        folderId,
      );
      if (data && data.image_3) {
        await this.googleDriveService.deleteFile(data.image_3);
      }
    }
    let file4;
    if (updateData.image_4) {
      file4 = await this.googleDriveService.uploadFile(
        updateData.image_4 as unknown as Express.Multer.File,
        folderId,
      );
      if (data && data.image_4) {
        await this.googleDriveService.deleteFile(data.image_4);
      }
    }

    let file5;
    if (updateData.image_5) {
      file5 = await this.googleDriveService.uploadFile(
        updateData.image_5 as unknown as Express.Multer.File,
        folderId,
      );
      if (data && data.image_5) {
        await this.googleDriveService.deleteFile(data.image_5);
      }
    }

    await this.bannerModel
      .findOneAndUpdate(
        {},
        {
          image_1: file1 ? file1.id : data.image_1,
          image_2: file2 ? file2.id : data.image_2,
          image_3: file3 ? file3.id : data.image_3,
          image_4: file4 ? file4.id : data.image_4,
          image_5: file5 ? file5.id : data.image_5,
          link_1: updateData.link_1 || '',
          link_2: updateData.link_2 || '',
          link_3: updateData.link_3 || '',
          link_4: updateData.link_4 || '',
          link_5: updateData.link_5 || '',
        },
        { upsert: true, new: true },
      )
      .exec();
    return { message: 'Update banner home success' };
  }

  async getBannerHome() {
    // logic get banner home
    return this.bannerModel.findOne().exec();
  }

  async updateConversionDataByConversionId(id: string) {
    return this.jobService.syncConversion(id);
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

  /** Top brands ranked by conversion count. */
  async getTopBrands() {
    const topBrands = await this.conversionModel.aggregate([
      { $group: { _id: '$offer_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'offers',
          localField: '_id',
          foreignField: 'offer_id',
          as: 'offer',
        },
      },
      { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          offer_id: '$_id',
          conversions: '$count',
          offer_name: '$offer.offer_name',
          logo: '$offer.logo',
          categories: '$offer.categories',
        },
      },
    ]);

    return { data: topBrands };
  }

  /** Save manual top brand ordering (array of offer IDs). */
  async saveTopBrands(order: string[]) {
    // Store as a banner-style config document
    await this.bannerModel.updateOne(
      { type: 'top_brands' },
      { $set: { type: 'top_brands', order, updatedAt: new Date() } },
      { upsert: true },
    );
    return { success: true, order };
  }
}
