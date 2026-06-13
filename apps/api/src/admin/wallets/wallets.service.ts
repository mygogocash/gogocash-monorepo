import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';
import { WalletAdjustment } from './schemas/wallet-adjustment.schema';
import { WalletAdjustDto } from './dto/wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<Conversion>,
    @InjectModel(Withdraw.name)
    private readonly withdrawModel: Model<Withdraw>,
    @InjectModel(WalletAdjustment.name)
    private readonly walletAdjustmentModel: Model<WalletAdjustment>,
  ) {}

  async findAll(query: { page?: string; limit?: string; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.search) {
      filter.$or = [
        { email: { $regex: query.search, $options: 'i' } },
        { username: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('email username country wallet_frozen createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const data = users.map((u) => ({
      _id: u._id?.toString(),
      email: u.email ?? '',
      username: u.username ?? '',
      country: u.country ?? '',
      wallet_frozen: u.wallet_frozen ?? false,
      createdAt: (u as any).createdAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const objectId = new Types.ObjectId(userId);

    const [conversions, withdrawals] = await Promise.all([
      this.conversionModel
        .find({ user_id: objectId })
        .sort({ datetime_conversion: -1 })
        .limit(20)
        .lean()
        .exec(),
      this.withdrawModel
        .find({ user_id: objectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .exec(),
    ]);

    return {
      user: {
        _id: user._id?.toString(),
        email: user.email,
        username: user.username,
        country: user.country,
        wallet_frozen: user.wallet_frozen ?? false,
        wallet_frozen_at: (user as any).wallet_frozen_at,
        createdAt: (user as any).createdAt,
      },
      conversions,
      withdrawals,
    };
  }

  async getAdjustments(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return this.walletAdjustmentModel
      .find({ user_id: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async freeze(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          wallet_frozen: true,
          wallet_frozen_at: new Date(),
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      _id: user._id?.toString(),
      wallet_frozen: user.wallet_frozen,
      wallet_frozen_at: (user as any).wallet_frozen_at,
    };
  }

  async unfreeze(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          wallet_frozen: false,
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      _id: user._id?.toString(),
      wallet_frozen: user.wallet_frozen,
    };
  }

  async adjust(
    userId: string,
    dto: WalletAdjustDto,
    adminId: string,
    adminName: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const adjustment = await this.walletAdjustmentModel.create({
      user_id: new Types.ObjectId(userId),
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency ?? 'USD',
      reason: dto.reason,
      admin_id: adminId,
      admin_name: adminName,
    });

    return adjustment.toObject();
  }
}
