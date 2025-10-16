import { Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { InjectModel } from '@nestjs/mongoose';
import { UserAdmin } from './user-admin/schemas/user-admin.schema';
import { Model } from 'mongoose';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserAdmin.name) private userAdminModel: Model<UserAdmin>,
  ) {}
  create(createAdminDto: CreateAdminDto) {
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

  findOne(id: number) {
    return this.userAdminModel.findById(id).exec();
  }

  update(id: number, updateAdminDto: UpdateAdminDto) {
    return this.userAdminModel.findByIdAndUpdate(id, updateAdminDto).exec();
  }

  remove(id: number) {
    // this.userAdminModel.findByIdAndDelete(id).exec();
    return null;
  }
}
