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
import { AdminActivityService } from '../activity/admin-activity.service';

@Injectable()
export class UserAdminService {
  constructor(
    @InjectModel('UserAdmin') private readonly userAdmin: Model<UserAdmin>,
    private readonly jwtService: JwtService,
    private readonly adminActivity: AdminActivityService,
  ) {}

  async login(
    createUserAdminDto: LoginAdminDto,
  ): Promise<UserAdmin & { token: string }> {
    const user = await this.userAdmin
      .findOne({
        $or: [
          { email: createUserAdminDto.email },
          { username: createUserAdminDto.email },
        ],
      })
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
    const created = await this.userAdmin.create(createUserAdminDto);
    await this.adminActivity.append({
      actor_type: 'admin',
      action: 'admin_user.updated',
      entity_type: 'admin_user',
      entity_id: String(created._id),
      summary: `Created admin user ${created.email || created.username}`,
      metadata: {
        email: created.email,
        role: created.role,
        change: 'created',
      },
    });
    return created;
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
    const previous = await this.userAdmin.findById(id).exec();
    const updated = await this.userAdmin
      .findByIdAndUpdate(id, updateUserAdminDto, { new: true })
      .exec();
    if (updated) {
      const roleChanged =
        previous?.role !== undefined &&
        updateUserAdminDto.role !== undefined &&
        previous.role !== updateUserAdminDto.role;
      await this.adminActivity.append({
        actor_type: 'admin',
        action: roleChanged ? 'admin_role.changed' : 'admin_user.updated',
        entity_type: 'admin_user',
        entity_id: String(updated._id),
        summary: roleChanged
          ? `Admin role ${previous?.role} → ${updated.role}`
          : `Updated admin user ${updated.email || updated.username}`,
        metadata: {
          email: updated.email,
          role: updated.role,
          previous_role: previous?.role,
        },
      });
    }
    return updated;
  }

  async remove(id: number): Promise<any> {
    return this.userAdmin.deleteOne({ _id: id }).exec();
  }

  async findById(id: string): Promise<UserAdmin | null> {
    return this.userAdmin.findById(id).select('-password').exec();
  }
}
