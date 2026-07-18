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
import { AdminActor } from '../activity/admin-activity.actor';

@Injectable()
export class UserAdminService {
  constructor(
    @InjectModel('UserAdmin') private readonly userAdmin: Model<UserAdmin>,
    private readonly jwtService: JwtService,
    private readonly adminActivity: AdminActivityService,
  ) {}

  async login(
    createUserAdminDto: LoginAdminDto,
  ): Promise<Omit<UserAdmin, 'password'> & { token: string }> {
    const user = await this.userAdmin
      .findOne({
        $or: [
          { email: createUserAdminDto.email },
          { username: createUserAdminDto.email },
        ],
      })
      .select('+password')
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
    // Generate JWT token for authentication. Embed `role` so the RolesGuard
    // can authorise without a DB roundtrip; absent role means legacy admin
    // (treated as superadmin in roleHasAccess for backward compat).
    const payload = {
      sub: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      session_version: user.session_version ?? 0,
    };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_ADMIN_SECRET,
    });
    return {
      ...this.withoutPassword(user),
      token,
    };
  }

  async register(
    createUserAdminDto: RegisterAdminDto,
    actor: AdminActor,
  ): Promise<Omit<UserAdmin, 'password'>> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserAdminDto.password,
      saltRounds,
    );
    const created = await this.userAdmin.create({
      ...createUserAdminDto,
      password: hashedPassword,
    });
    await this.adminActivity.append({
      actor_type: 'admin',
      actor_id: actor.id,
      actor_label: actor.label,
      action: 'admin_user.created',
      entity_type: 'admin_user',
      entity_id: String(created._id),
      summary: `Created admin user ${created.email || created.username}`,
      metadata: {
        email: created.email,
        role: created.role,
      },
    });
    return this.withoutPassword(created);
  }
  async create(
    createUserAdminDto: CreateAdminDto,
    actor: AdminActor,
  ): Promise<Omit<UserAdmin, 'password'>> {
    const created = await this.userAdmin.create(createUserAdminDto);
    await this.adminActivity.append({
      actor_type: 'admin',
      actor_id: actor.id,
      actor_label: actor.label,
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
    return this.withoutPassword(created);
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
    actor: AdminActor,
  ): Promise<UserAdmin | null> {
    const previous = await this.userAdmin.findById(id).exec();
    const updated = await this.userAdmin
      .findByIdAndUpdate(id, updateUserAdminDto, { new: true })
      .exec();
    if (updated) {
      await this.adminActivity.append({
        actor_type: 'admin',
        actor_id: actor.id,
        actor_label: actor.label,
        action: 'admin_user.updated',
        entity_type: 'admin_user',
        entity_id: String(updated._id),
        summary: `Updated admin user ${updated.email || updated.username}`,
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

  private withoutPassword(
    user: UserAdmin & { toObject?: () => Record<string, unknown> },
  ): Omit<UserAdmin, 'password'> {
    const value =
      typeof user.toObject === 'function'
        ? user.toObject()
        : ({ ...user } as Record<string, unknown>);
    const { password: _password, ...safe } = value;
    return safe as Omit<UserAdmin, 'password'>;
  }
}
