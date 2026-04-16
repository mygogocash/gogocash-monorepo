import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
        .aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
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
      total_revenue: revenueResult.length > 0 ? revenueResult[0].total_revenue : 0,
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
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    const plan = await this.subscriptionPlanModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec();

    if (!plan) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    return plan;
  }

  async deletePlan(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    const plan = await this.subscriptionPlanModel
      .findByIdAndDelete(id)
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
      filter.status = query.status;
    }

    if (query.planId && Types.ObjectId.isValid(query.planId)) {
      filter.plan_id = new Types.ObjectId(query.planId);
    }

    if (query.search) {
      const matchingUsers = await this.userModel
        .find({
          $or: [
            { email: { $regex: query.search, $options: 'i' } },
            { username: { $regex: query.search, $options: 'i' } },
          ],
        })
        .select('_id')
        .lean()
        .exec();

      filter.user_id = {
        $in: matchingUsers.map(
          (u) => new Types.ObjectId(u._id?.toString()),
        ),
      };
    }

    const [subscriptions, total] = await Promise.all([
      this.subscriptionModel
        .find(filter)
        .populate('user_id', 'email username')
        .populate('plan_id', 'name price currency billing_cycle')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.subscriptionModel.countDocuments(filter).exec(),
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
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    const subscription = await this.subscriptionModel
      .findById(id)
      .populate('user_id', 'email username')
      .populate('plan_id', 'name description price currency billing_cycle features')
      .lean()
      .exec();

    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    return subscription;
  }

  async performAction(
    id: string,
    action: string,
    days?: number,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    const subscription = await this.subscriptionModel.findById(id).exec();
    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    switch (action) {
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
      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }

    await subscription.save();
    return subscription.toObject();
  }
}
