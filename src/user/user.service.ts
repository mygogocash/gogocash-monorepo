import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
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

  findAll() {
    return `This action returns all user`;
  }

  findOne(data: { [key: string]: string }) {
    return this.userModel.findOne(data);
  }

  update(id: Types.ObjectId, updateUserDto: UpdateUserDto) {
    console.log(updateUserDto);
    return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true });
  }
}
