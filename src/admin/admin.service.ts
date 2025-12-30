/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import {
  UpdateAdminDto,
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

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserAdmin.name) private userAdminModel: Model<UserAdmin>,
    @InjectModel(Withdraw.name) private withdrawModel: Model<Withdraw>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,

    private readonly googleDriveService: GoogleDriveService,
    private involveService: InvolveService,
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

  async getConversionAll(
    page: string = '1',
    limit: string = '10',
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

  async getConversionInWithdraw(body: number[]) {
    return this.involveService.getConversionAll(
      { page: '1', limit: '1000' },
      { conversion_id: body?.join('|') },
    );
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
      logo_circle?: Express.Multer.File;
      offer_name_display?: string;
      disabled?: boolean;
      commission_store?: number;
      max_cap?: number;
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
          logo_circle: logoCircleFile ? logoCircleFile.id : offer.logo_circle,
          offer_name_display:
            updateData.offer_name_display ?? offer.offer_name_display,
          disabled: Boolean(updateData.disabled ?? offer.disabled),
          commission_store:
            updateData.commission_store ?? offer.commission_store,
          max_cap: updateData.max_cap ?? offer.max_cap,
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
}
