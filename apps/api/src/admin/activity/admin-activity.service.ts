import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import {
  AdminActivityActorType,
  AdminActivityEvent,
} from './schemas/admin-activity-event.schema';

export type AppendActivityInput = {
  actor_type: AdminActivityActorType;
  actor_id?: string;
  actor_label?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  occurred_at?: Date;
};

export type ListActivityQuery = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  actor_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  search?: string;
};

@Injectable()
export class AdminActivityService {
  private readonly logger = new Logger(AdminActivityService.name);

  constructor(
    @InjectModel(AdminActivityEvent.name)
    private readonly activityModel: Model<AdminActivityEvent>,
  ) {}

  /**
   * Append-only audit write. Never throws to callers — money paths must not
   * fail because activity logging failed.
   */
  async append(input: AppendActivityInput): Promise<void> {
    try {
      await this.activityModel.create({
        occurred_at: input.occurred_at ?? new Date(),
        actor_type: input.actor_type,
        actor_id: input.actor_id,
        actor_label: input.actor_label,
        action: input.action,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        summary: input.summary,
        metadata: input.metadata ?? {},
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'unknown activity append error';
      this.logger.error(`Failed to append activity event: ${message}`);
    }
  }

  async list(query: ListActivityQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.actor_id?.trim()) {
      filter.actor_id = query.actor_id.trim();
    }
    if (query.action?.trim()) {
      filter.action = query.action.trim();
    }
    if (query.entity_type?.trim()) {
      filter.entity_type = query.entity_type.trim();
    }
    if (query.entity_id?.trim()) {
      filter.entity_id = query.entity_id.trim();
    }

    const occurredRange: Record<string, Date> = {};
    if (query.from) {
      const from = new Date(query.from);
      if (!Number.isNaN(from.getTime())) {
        occurredRange.$gte = from;
      }
    }
    if (query.to) {
      const to = new Date(query.to);
      if (!Number.isNaN(to.getTime())) {
        occurredRange.$lte = to;
      }
    }
    if (Object.keys(occurredRange).length > 0) {
      filter.occurred_at = occurredRange;
    }

    if (query.search?.trim()) {
      const q = escapeRegexLiteral(query.search.trim());
      filter.$or = [
        { summary: { $regex: q, $options: 'i' } },
        { actor_label: { $regex: q, $options: 'i' } },
        { action: { $regex: q, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.activityModel
        .find(filter)
        .sort({ occurred_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.activityModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }
}
