import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  requireObjectId,
  mongoCaseInsensitiveRegex,
  mongoFilter,
  requireOneOf,
} from 'src/common/mongo-query';
import { MissionOrder } from 'src/offer/schemas/missing-order.schema';
import { toMissingOrderClaim } from './dto/missing-order.response.dto';
import { normalizeMissionOrderStatus } from './missing-order-status';

@Injectable()
export class MissingOrdersService {
  constructor(
    @InjectModel(MissionOrder.name)
    private readonly missingOrderModel: Model<MissionOrder>,
  ) {}

  async getStats() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [statusCounts, avgResolution, approvedWeek, rejectedWeek] =
      await Promise.all([
        this.missingOrderModel.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        this.missingOrderModel.aggregate([
          { $match: { resolved_at: { $ne: null } } },
          {
            $project: {
              resolutionHours: {
                $divide: [
                  { $subtract: ['$resolved_at', '$createdAt'] },
                  1000 * 60 * 60,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgHours: { $avg: '$resolutionHours' },
            },
          },
        ]),
        this.missingOrderModel
          .countDocuments({
            status: 'approved',
            resolved_at: { $gte: oneWeekAgo },
          })
          .exec(),
        this.missingOrderModel
          .countDocuments({
            status: 'rejected',
            resolved_at: { $gte: oneWeekAgo },
          })
          .exec(),
      ]);

    const byStatus: Record<string, number> = {};
    for (const entry of statusCounts) {
      const status = normalizeMissionOrderStatus(entry._id);
      byStatus[status] = (byStatus[status] ?? 0) + entry.count;
    }

    const totalOpen =
      (byStatus['pending'] ?? 0) + (byStatus['under_review'] ?? 0);

    return {
      byStatus,
      totalOpen,
      pendingReview: totalOpen,
      approvedWeek,
      rejectedWeek,
      avgResolutionHours: avgResolution[0]?.avgHours ?? null,
    };
  }

  async findAll(query: {
    page?: string;
    limit?: string;
    status?: string;
    search?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.status) {
      filter.status = requireOneOf(
        query.status,
        ['pending', 'under_review', 'approved', 'rejected'] as const,
        'status',
      );
    }
    if (query.search?.trim()) {
      if (query.search.trim().length > 120) {
        throw new BadRequestException('The search you provided is not valid.');
      }
      const pattern = mongoCaseInsensitiveRegex(query.search);
      filter.$or = [
        { order_id: pattern },
        { 'customer_snapshot.name': pattern },
        { 'customer_snapshot.email': pattern },
        { 'offer_snapshot.name': pattern },
      ];
    }
    if (query.from || query.to) {
      const submittedAt: Record<string, Date> = {};
      for (const [operator, value] of [
        ['$gte', query.from],
        ['$lte', query.to],
      ] as const) {
        if (!value) continue;
        // Calendar filters use an explicit UTC convention. A date-only upper
        // bound includes that whole day instead of stopping at midnight.
        const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
        const date = new Date(
          dateOnly
            ? `${value}T${operator === '$gte' ? '00:00:00.000' : '23:59:59.999'}Z`
            : value,
        );
        if (Number.isNaN(date.getTime())) {
          throw new BadRequestException(
            `The ${operator === '$gte' ? 'from' : 'to'} date is not valid.`,
          );
        }
        submittedAt[operator] = date;
      }
      filter.createdAt = submittedAt;
    }

    const [data, total] = await Promise.all([
      this.missingOrderModel
        .find(mongoFilter(filter))
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.missingOrderModel.countDocuments(mongoFilter(filter)).exec(),
    ]);

    return {
      data: data.map((row) =>
        toMissingOrderClaim(row as unknown as Record<string, unknown>),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const orderId = requireObjectId(id, 'missing order id');

    const order = await this.missingOrderModel.findById(orderId).lean().exec();
    if (!order) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    return toMissingOrderClaim(order as unknown as Record<string, unknown>);
  }

  async approve(id: string, note?: string) {
    const orderId = requireObjectId(id, 'missing order id');

    const update: Record<string, any> = {
      status: 'approved',
      resolved_at: new Date(),
    };
    if (note) {
      update.resolution_note = note;
    }

    const order = await this.missingOrderModel
      .findByIdAndUpdate(orderId, { $set: update }, { new: true })
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    return toMissingOrderClaim(order as unknown as Record<string, unknown>);
  }

  async reject(id: string, note?: string) {
    const orderId = requireObjectId(id, 'missing order id');

    const update: Record<string, any> = {
      status: 'rejected',
      resolved_at: new Date(),
    };
    if (note) {
      update.resolution_note = note;
      update.rejection_reason = note;
    }

    const order = await this.missingOrderModel
      .findByIdAndUpdate(orderId, { $set: update }, { new: true })
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    return toMissingOrderClaim(order as unknown as Record<string, unknown>);
  }

  async assign(id: string, adminId: string) {
    const orderId = requireObjectId(id, 'missing order id');

    const order = await this.missingOrderModel
      .findByIdAndUpdate(
        orderId,
        {
          $set: {
            assigned_to: adminId,
            status: 'under_review',
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    return toMissingOrderClaim(order as unknown as Record<string, unknown>);
  }

  async addNote(id: string, adminId: string, adminName: string, text: string) {
    const orderId = requireObjectId(id, 'missing order id');

    const order = await this.missingOrderModel
      .findByIdAndUpdate(
        orderId,
        {
          $push: {
            notes: {
              admin_id: adminId,
              admin_name: adminName,
              text,
              created_at: new Date(),
            },
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    return toMissingOrderClaim(order as unknown as Record<string, unknown>);
  }
}
