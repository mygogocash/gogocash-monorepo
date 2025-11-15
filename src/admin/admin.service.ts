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

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserAdmin.name) private userAdminModel: Model<UserAdmin>,
    @InjectModel(Withdraw.name) private withdrawModel: Model<Withdraw>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
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
}
