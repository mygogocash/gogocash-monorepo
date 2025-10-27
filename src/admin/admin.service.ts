import { Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { InjectModel } from '@nestjs/mongoose';
import { UserAdmin } from './user-admin/schemas/user-admin.schema';
import { Model } from 'mongoose';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';
import { InvolveService } from 'src/involve/involve.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserAdmin.name) private userAdminModel: Model<UserAdmin>,
    @InjectModel(Withdraw.name) private withdrawModel: Model<Withdraw>,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    search?: string,
  ) {
    const conversions = await this.involveService.getConversionAll({
      page: page,
      limit: limit,
    });
    return conversions;
  }
}
