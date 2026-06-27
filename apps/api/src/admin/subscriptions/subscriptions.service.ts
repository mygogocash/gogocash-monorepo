import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  mongoCaseInsensitiveRegex,
  mongoFilter,
  requireObjectId,
  requireOneOf,
} from 'src/common/mongo-query';
import { User } from 'src/user/schemas/user.schema';
import { SubscriptionPlan } from './schemas/subscription-plan.schema';
import { Subscription } from './schemas/subscription.schema';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(SubscriptionPlan.name)
    private readonly subscriptionPlanModel: Model<SubscriptionPlan>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
  ) {}

  async getStats() {
    const [statusCounts, revenueResult] = await Promise.all([
      this.subscriptionModel
        .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
        .exec(),
      this.subscriptionModel
        .aggregate([
          { $match: { status: 'active' } },
          {
            $lookup: {
              from: 'subscriptionplans',
              localField: 'plan_id',
              foreignField: '_id',
              as: 'plan',
            },
          },
          { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              total_revenue: { $sum: '$plan.price' },
            },
          },
        ])
        .exec(),
    ]);

    const byStatus: Record<string, number> = {};
    for (const entry of statusCounts) {
      byStatus[entry._id] = entry.count;
    }

    return {
      by_status: byStatus,
      total_revenue:
        revenueResult.length > 0 ? revenueResult[0].total_revenue : 0,
    };
  }

  async getPlans() {
    return this.subscriptionPlanModel.find().sort({ price: 1 }).lean().exec();
  }

  async createPlan(data: CreateSubscriptionPlanDto) {
    const plan = await this.subscriptionPlanModel.create(data);
    return plan.toObject();
  }

  async updatePlan(id: string, data: UpdateSubscriptionPlanDto) {
    const planId = requireObjectId(id, 'plan id');
    const patch: Partial<UpdateSubscriptionPlanDto> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.price !== undefined) patch.price = data.price;
    if (data.currency !== undefined) patch.currency = data.currency;
    if (data.billing_cycle !== undefined)
      patch.billing_cycle = data.billing_cycle;
    if (data.features !== undefined) patch.features = data.features;
    if (data.trial_days !== undefined) patch.trial_days = data.trial_days;
    if (data.is_active !== undefined) patch.is_active = data.is_active;

    const plan = await this.subscriptionPlanModel
      .findByIdAndUpdate(planId, { $set: patch }, { new: true })
      .lean()
      .exec();

    if (!plan) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    return plan;
  }

  async deletePlan(id: string) {
    const planId = requireObjectId(id, 'plan id');

    const plan = await this.subscriptionPlanModel
      .findByIdAndDelete(planId)
      .exec();
    if (!plan) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    return { deleted: true };
  }

  async getSubscriptions(query: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    planId?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status) {
      filter.status = requireOneOf(
        query.status,
        ['active', 'paused', 'cancelled', 'expired'] as const,
        'status',
      );
    }

    if (query.planId) {
      filter.plan_id = requireObjectId(query.planId, 'plan id');
    }

    if (query.search) {
      const searchRegex = mongoCaseInsensitiveRegex(query.search);
      const matchingUsers = await this.userModel
        .find({
          $or: [{ email: searchRegex }, { username: searchRegex }],
        })
        .select('_id')
        .lean()
        .exec();

      filter.user_id = {
        $in: matchingUsers.map((u) => new Types.ObjectId(u._id?.toString())),
      };
    }

    const [subscriptions, total] = await Promise.all([
      this.subscriptionModel
        .find(mongoFilter(filter))
        .populate('user_id', 'email username')
        .populate('plan_id', 'name price currency billing_cycle')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.subscriptionModel.countDocuments(mongoFilter(filter)).exec(),
    ]);

    return {
      data: subscriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDetail(id: string) {
    const subscriptionId = requireObjectId(id, 'subscription id');

    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .populate('user_id', 'email username')
      .populate(
        'plan_id',
        'name description price currency billing_cycle features',
      )
      .lean()
      .exec();

    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    return subscription;
  }

  async performAction(id: string, action: string, days?: number) {
    const subscriptionId = requireObjectId(id, 'subscription id');
    const normalizedAction = requireOneOf(
      action,
      ['cancel', 'pause', 'resume', 'extend'] as const,
      'action',
    );

    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .exec();
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    switch (normalizedAction) {
      case 'cancel': {
        if (subscription.status === 'cancelled') {
          throw new BadRequestException('Subscription is already cancelled');
        }
        subscription.status = 'cancelled';
        subscription.cancelled_at = new Date();
        break;
      }
      case 'pause': {
        if (subscription.status !== 'active') {
          throw new BadRequestException(
            'Only active subscriptions can be paused',
          );
        }
        subscription.status = 'paused';
        subscription.paused_at = new Date();
        break;
      }
      case 'resume': {
        if (subscription.status !== 'paused') {
          throw new BadRequestException(
            'Only paused subscriptions can be resumed',
          );
        }
        subscription.status = 'active';
        subscription.paused_at = null;
        break;
      }
      case 'extend': {
        const extensionDays = days ?? 30;
        const currentEnd = new Date(subscription.current_period_end);
        currentEnd.setDate(currentEnd.getDate() + extensionDays);
        subscription.current_period_end = currentEnd;
        break;
      }
      default: {
        const _exhaustive: never = normalizedAction;
        throw new BadRequestException(`Unknown action: ${_exhaustive}`);
      }
    }

    await subscription.save();
    return subscription.toObject();
  }
}
