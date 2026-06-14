import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MissingOrder } from './schemas/missing-order.schema';

@Injectable()
export class MissingOrdersService {
  constructor(
    @InjectModel(MissingOrder.name)
    private readonly missingOrderModel: Model<MissingOrder>,
  ) {}

  async getStats() {
    const [statusCounts, avgResolution] = await Promise.all([
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
    ]);

    const byStatus: Record<string, number> = {};
    for (const entry of statusCounts) {
      byStatus[entry._id || 'unknown'] = entry.count;
    }

    return {
      byStatus,
      totalOpen: (byStatus['pending'] ?? 0) + (byStatus['investigating'] ?? 0),
      avgResolutionHours: avgResolution[0]?.avgHours ?? null,
    };
  }

  async findAll(query: { page?: string; limit?: string; status?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.status) {
      filter.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.missingOrderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.missingOrderModel.countDocuments(filter).exec(),
    ]);

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

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    const order = await this.missingOrderModel.findById(id).lean().exec();
    if (!order) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    return order;
  }

  async approve(id: string, note?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    const update: Record<string, any> = {
      status: 'approved',
      resolved_at: new Date(),
    };
    if (note) {
      update.resolution_note = note;
    }

    const order = await this.missingOrderModel
      .findByIdAndUpdate(id, update, { new: true })
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    return order;
  }

  async reject(id: string, note?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    const update: Record<string, any> = {
      status: 'rejected',
      resolved_at: new Date(),
    };
    if (note) {
      update.resolution_note = note;
    }

    const order = await this.missingOrderModel
      .findByIdAndUpdate(id, update, { new: true })
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    return order;
  }

  async assign(id: string, adminId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    const order = await this.missingOrderModel
      .findByIdAndUpdate(
        id,
        { assigned_to: adminId, status: 'investigating' },
        { new: true },
      )
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    return order;
  }

  async addNote(id: string, adminId: string, adminName: string, text: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Missing order ${id} not found`);
    }

    const order = await this.missingOrderModel
      .findByIdAndUpdate(
        id,
        {
          $push: {
            notes: {
              admin_id: adminId,
              admin_name: adminName,
              text,
              createdAt: new Date(),
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

    return order;
  }
}
