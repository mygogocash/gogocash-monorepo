import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import {
  CreateAdminDto,
  LoginAdminDto,
  RegisterAdminDto,
} from '../dto/create-admin.dto';
import { Model } from 'mongoose';
import { UserAdmin } from './schemas/user-admin.schema';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserAdminService {
  constructor(
    @InjectModel('UserAdmin') private readonly userAdmin: Model<UserAdmin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    createUserAdminDto: LoginAdminDto,
  ): Promise<UserAdmin & { token: string }> {
    // Match on email only: usernames are not unique (invite flow derives
    // them from email local-parts), so a username lookup can resolve to the
    // wrong account (#374).
    const user = await this.userAdmin
      .findOne({ email: createUserAdminDto.email })
      .exec();

    if (!user) {
      // Use the same generic message to avoid leaking which emails exist.
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      createUserAdminDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    delete user.password;
    // Generate JWT token for authentication. Embed `role` so the RolesGuard
    // can authorise without a DB roundtrip; absent role means legacy admin
    // (treated as superadmin in roleHasAccess for backward compat).
    const payload = {
      sub: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_ADMIN_SECRET,
    });
    return {
      ...user.toObject(),
      token,
    };
  }

  async register(createUserAdminDto: RegisterAdminDto): Promise<UserAdmin> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserAdminDto.password,
      saltRounds,
    );
    createUserAdminDto.password = hashedPassword;
    return this.userAdmin.create(createUserAdminDto);
  }
  async create(createUserAdminDto: CreateAdminDto): Promise<UserAdmin> {
    return this.userAdmin.create(createUserAdminDto);
  }
  async findAll(): Promise<UserAdmin[]> {
    return this.userAdmin.find().exec();
  }

  async findOne(id: number): Promise<UserAdmin | null> {
    return this.userAdmin.findById(id).exec();
  }

  async update(
    id: number,
    updateUserAdminDto: UpdateAdminDto,
  ): Promise<UserAdmin | null> {
    return this.userAdmin
      .findByIdAndUpdate(id, updateUserAdminDto, { new: true })
      .exec();
  }

  async remove(id: number): Promise<any> {
    return this.userAdmin.deleteOne({ _id: id }).exec();
  }

  async findById(id: string): Promise<UserAdmin | null> {
    return this.userAdmin.findById(id).select('-password').exec();
  }
}
