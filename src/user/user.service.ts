import { Injectable } from '@nestjs/common';
import { CreateUserDto, UpdateCountryDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}
  async create(createUserDto: CreateUserDto) {
    // Find or create the user in the database
    const user = await this.userModel.findOneAndUpdate(
      { address: createUserDto.address },
      createUserDto,
      { upsert: true, new: true },
    );

    return user;
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { address: { $regex: search, $options: 'i' } },
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
  update(id: Types.ObjectId, updateUserDto: UpdateUserDto) {
    return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true });
  }

  updateCountry(updateCountryDto: UpdateCountryDto, id_crossmint: string) {
    return this.userModel.findOneAndUpdate(
      { id_crossmint },
      { country: updateCountryDto.country },
      { new: true },
    );
  }
}
