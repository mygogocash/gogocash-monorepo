import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  mongoCaseInsensitiveRegex,
  mongoFilter,
  requireObjectId,
  requireOneOf,
} from 'src/common/mongo-query';
import { User } from 'src/user/schemas/user.schema';
import { MembershipTier } from './schemas/membership-tier.schema';
import { Membership } from './schemas/membership.schema';
import {
  CreateMembershipTierDto,
  UpdateMembershipTierDto,
} from './dto/membership.dto';

@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(MembershipTier.name)
    private readonly membershipTierModel: Model<MembershipTier>,
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<Membership>,
  ) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeCount, newThisMonth] = await Promise.all([
      this.membershipModel.countDocuments({ status: 'active' }).exec(),
      this.membershipModel
        .countDocuments({
          status: 'active',
          createdAt: { $gte: startOfMonth },
        })
        .exec(),
    ]);

    return {
      active_memberships: activeCount,
      new_this_month: newThisMonth,
    };
  }

  async getTiers() {
    return this.membershipTierModel
      .find()
      .sort({ sort_order: 1 })
      .lean()
      .exec();
  }

  async createTier(data: CreateMembershipTierDto) {
    const tier = await this.membershipTierModel.create(data);
    return tier.toObject();
  }

  async updateTier(id: string, data: UpdateMembershipTierDto) {
    const tierId = requireObjectId(id, 'tier id');
    const patch: Partial<UpdateMembershipTierDto> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.price !== undefined) patch.price = data.price;
    if (data.currency !== undefined) patch.currency = data.currency;
    if (data.benefits !== undefined) patch.benefits = data.benefits;
    if (data.cashback_bonus_percent !== undefined) {
      patch.cashback_bonus_percent = data.cashback_bonus_percent;
    }
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (data.sort_order !== undefined) patch.sort_order = data.sort_order;

    const tier = await this.membershipTierModel
      .findByIdAndUpdate(tierId, { $set: patch }, { new: true })
      .lean()
      .exec();

    if (!tier) {
      throw new NotFoundException(`Tier ${id} not found`);
    }

    return tier;
  }

  async deleteTier(id: string) {
    const tierId = requireObjectId(id, 'tier id');

    const tier = await this.membershipTierModel
      .findByIdAndDelete(tierId)
      .exec();
    if (!tier) {
      throw new NotFoundException(`Tier ${id} not found`);
    }

    return { deleted: true };
  }

  async getMembers(query: {
    page?: string;
    limit?: string;
    search?: string;
    tierId?: string;
    status?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status) {
      filter.status = requireOneOf(
        query.status,
        ['active', 'cancelled', 'expired'] as const,
        'status',
      );
    }

    if (query.tierId) {
      filter.tier_id = requireObjectId(query.tierId, 'tier id');
    }

    // If searching by email/username, we need to find matching user IDs first
    let userFilter: Types.ObjectId[] | null = null;
    if (query.search) {
      const searchRegex = mongoCaseInsensitiveRegex(query.search);
      const matchingUsers = await this.userModel
        .find(
          mongoFilter({
            $or: [{ email: searchRegex }, { username: searchRegex }],
          }),
        )
        .select('_id')
        .lean()
        .exec();

      userFilter = matchingUsers.map(
        (u) => new Types.ObjectId(u._id?.toString()),
      );
      filter.user_id = { $in: userFilter };
    }

    const [memberships, total] = await Promise.all([
      this.membershipModel
        .find(mongoFilter(filter))
        .populate('user_id', 'email username')
        .populate('tier_id', 'name price currency')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.membershipModel.countDocuments(mongoFilter(filter)).exec(),
    ]);

    return {
      data: memberships,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async changeTier(userId: string, tierId: string) {
    const userObjectId = requireObjectId(userId, 'user id');
    const tierObjectId = requireObjectId(tierId, 'tier id');

    const tier = await this.membershipTierModel
      .findById(tierObjectId)
      .lean()
      .exec();
    if (!tier) {
      throw new NotFoundException(`Tier ${tierId} not found`);
    }

    const membership = await this.membershipModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        [
          {
            $set: {
              tier_id: tierObjectId,
              tier_assignment_started_at: {
                $cond: [
                  { $eq: ['$tier_id', tierObjectId] },
                  '$tier_assignment_started_at',
                  '$$NOW',
                ],
              },
            },
          },
        ],
        { new: true, updatePipeline: true },
      )
      .populate('tier_id', 'name price currency')
      .lean()
      .exec();

    if (!membership) {
      throw new NotFoundException(`Membership for user ${userId} not found`);
    }

    return membership;
  }

  async cancelMembership(userId: string, reason: string) {
    const userObjectId = requireObjectId(userId, 'user id');

    const membership = await this.membershipModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        {
          $set: {
            status: 'cancelled',
            cancelled_at: new Date(),
            cancellation_reason: reason,
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!membership) {
      throw new NotFoundException(`Membership for user ${userId} not found`);
    }

    return membership;
  }
}
