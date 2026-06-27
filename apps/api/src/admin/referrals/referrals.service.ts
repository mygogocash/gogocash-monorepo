import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  mongoCaseInsensitiveRegex,
  requireObjectId,
} from 'src/common/mongo-query';
import { ReferralConfig } from './schemas/referral-config.schema';
import { User } from 'src/user/schemas/user.schema';
import { Point } from 'src/point/schemas/point.schema';
import { UpdateReferralConfigDto } from './dto/referral.dto';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectModel(ReferralConfig.name)
    private readonly referralConfigModel: Model<ReferralConfig>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Point.name)
    private readonly pointModel: Model<Point>,
  ) {}

  async getConfig() {
    const existing = await this.referralConfigModel.findOne().lean().exec();
    if (existing) {
      return existing;
    }

    // Create default config if none exists (singleton)
    const created = await this.referralConfigModel.create({
      enabled: true,
      reward_type: 'points',
      referrer_reward: 100,
      referee_reward: 50,
      currency: 'points',
      max_referrals_per_user: 0,
      require_approval: false,
    });

    return created.toObject();
  }

  async updateConfig(data: UpdateReferralConfigDto) {
    const patch: Partial<UpdateReferralConfigDto> = {};
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.reward_type !== undefined) patch.reward_type = data.reward_type;
    if (data.referrer_reward !== undefined)
      patch.referrer_reward = data.referrer_reward;
    if (data.referee_reward !== undefined)
      patch.referee_reward = data.referee_reward;
    if (data.currency !== undefined) patch.currency = data.currency;
    if (data.max_referrals_per_user !== undefined) {
      patch.max_referrals_per_user = data.max_referrals_per_user;
    }
    if (data.require_approval !== undefined)
      patch.require_approval = data.require_approval;

    const config = await this.referralConfigModel
      .findOneAndUpdate({}, { $set: patch }, { new: true, upsert: true })
      .lean()
      .exec();

    return config;
  }

  async findAll(query: { page?: string; limit?: string; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      referred_by: { $exists: true, $nin: [null, ''] },
    };

    if (query.search) {
      const searchRegex = mongoCaseInsensitiveRegex(query.search);
      filter.$or = [{ email: searchRegex }, { username: searchRegex }];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('email username referred_by referral_code createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    // Gather referrer IDs to look up referrer info
    const referrerIds = [
      ...new Set(
        users
          .map((u) => u.referred_by)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const referrers = referrerIds.length
      ? await this.userModel
          .find({ _id: { $in: referrerIds } })
          .select('email username')
          .lean()
          .exec()
      : [];

    const referrerMap = new Map(referrers.map((r) => [r._id?.toString(), r]));

    const data = users.map((u) => {
      const referrer = referrerMap.get(u.referred_by ?? '');
      return {
        _id: u._id?.toString(),
        email: u.email ?? '',
        username: u.username ?? '',
        referred_by: u.referred_by ?? '',
        referrer_email: referrer?.email ?? '',
        referrer_username: referrer?.username ?? '',
        referral_code: u.referral_code ?? '',
        createdAt: (u as any).createdAt,
      };
    });

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

  async getTree(userId: string) {
    const userObjectId = requireObjectId(userId, 'user id');

    const user = await this.userModel.findById(userObjectId).lean().exec();
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const referredUsers = await this.userModel
      .find({ referred_by: userObjectId.toHexString() })
      .select('email username referral_code createdAt')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return {
      referrer: {
        _id: user._id?.toString(),
        email: user.email,
        username: user.username,
        referral_code: user.referral_code,
      },
      referrals: referredUsers.map((u) => ({
        _id: u._id?.toString(),
        email: u.email ?? '',
        username: u.username ?? '',
        referral_code: u.referral_code ?? '',
        createdAt: (u as any).createdAt,
      })),
      total: referredUsers.length,
    };
  }

  async approve(id: string) {
    const pointId = requireObjectId(id, 'record id');

    const point = await this.pointModel
      .findOneAndUpdate(
        { _id: pointId, action: 'referral' },
        { $set: { type: 'add' } },
        { new: true },
      )
      .lean()
      .exec();

    if (!point) {
      throw new NotFoundException(`Referral point record ${id} not found`);
    }

    return point;
  }

  async reject(id: string) {
    const pointId = requireObjectId(id, 'record id');

    const point = await this.pointModel
      .findOneAndUpdate(
        { _id: pointId, action: 'referral' },
        { $set: { type: 'remove' } },
        { new: true },
      )
      .lean()
      .exec();

    if (!point) {
      throw new NotFoundException(`Referral point record ${id} not found`);
    }

    return point;
  }
}
