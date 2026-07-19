import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import {
  AdminActivityActorType,
  AdminActivityEvent,
} from './schemas/admin-activity-event.schema';
import {
  ADMIN_ACTIVITY_MAX_FILTER_LENGTH,
  ADMIN_ACTIVITY_MAX_LIMIT,
  ADMIN_ACTIVITY_MAX_PAGE,
  ADMIN_ACTIVITY_MAX_SEARCH_LENGTH,
} from './dto/list-admin-activity-query.dto';

type ActivityDetails = {
  action: string;
  entity_type: string;
  entity_id?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  occurred_at?: Date;
};

export type AppendActivityInput = ActivityDetails &
  (
    | {
        actor_type: 'admin';
        actor_id: string;
        actor_label: string;
      }
    | {
        actor_type: Exclude<AdminActivityActorType, 'admin'>;
        actor_id?: string;
        actor_label?: string;
      }
  );

export type ListActivityQuery = {
  page?: number | string;
  limit?: number | string;
  from?: string;
  to?: string;
  actor_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  search?: string;
};

/** Payout evidence / media refs must not ship to the activity list UI. */
const REDACTED_METADATA_KEYS = new Set(['slip_file', 'previous_slip_file']);

@Injectable()
export class AdminActivityService {
  constructor(
    @InjectModel(AdminActivityEvent.name)
    private readonly activityModel: Model<AdminActivityEvent>,
  ) {}

  /**
   * Durable standalone append. Failures propagate so a privileged caller can
   * never report success after silently losing its forensic record.
   * Security-sensitive transactional mutations should use appendRequired.
   */
  async append(input: AppendActivityInput): Promise<void> {
    await this.activityModel.create(this.toDocument(input));
  }

  /**
   * Transactional append for security and money events. Any write failure is
   * deliberately propagated so Mongo aborts the enclosing mutation instead of
   * committing a privileged action without its forensic record.
   */
  async appendRequired(
    input: AppendActivityInput,
    session: ClientSession,
  ): Promise<void> {
    await this.activityModel.create([this.toDocument(input)], { session });
  }

  async list(query: ListActivityQuery) {
    const page = this.boundedInteger(
      query.page,
      1,
      ADMIN_ACTIVITY_MAX_PAGE,
      'page',
    );
    const limit = this.boundedInteger(
      query.limit,
      20,
      ADMIN_ACTIVITY_MAX_LIMIT,
      'limit',
    );
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    const actorId = this.boundedText(
      query.actor_id,
      ADMIN_ACTIVITY_MAX_FILTER_LENGTH,
      'actor_id',
    );
    if (actorId) {
      filter.actor_id = actorId;
    }
    const action = this.boundedText(
      query.action,
      ADMIN_ACTIVITY_MAX_FILTER_LENGTH,
      'action',
    );
    if (action) {
      filter.action = action;
    }
    const entityType = this.boundedText(
      query.entity_type,
      ADMIN_ACTIVITY_MAX_FILTER_LENGTH,
      'entity_type',
    );
    if (entityType) {
      filter.entity_type = entityType;
    }
    const entityId = this.boundedText(
      query.entity_id,
      ADMIN_ACTIVITY_MAX_FILTER_LENGTH,
      'entity_id',
    );
    if (entityId) {
      filter.entity_id = entityId;
    }

    const occurredRange: Record<string, Date> = {};
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    if (query.from) {
      fromDate = this.validDate(query.from, 'from');
      occurredRange.$gte = fromDate;
    }
    if (query.to) {
      toDate = this.validDate(query.to, 'to');
      occurredRange.$lte = toDate;
    }
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('from must be before or equal to to');
    }
    if (Object.keys(occurredRange).length > 0) {
      filter.occurred_at = occurredRange;
    }

    const search = this.boundedText(
      query.search,
      ADMIN_ACTIVITY_MAX_SEARCH_LENGTH,
      'search',
    );
    if (search) {
      const q = escapeRegexLiteral(search);
      filter.$or = [
        { summary: { $regex: q, $options: 'i' } },
        { actor_label: { $regex: q, $options: 'i' } },
        { action: { $regex: q, $options: 'i' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.activityModel
        .find(filter)
        .sort({ occurred_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.activityModel.countDocuments(filter).exec(),
    ]);

    const data = rows.map((row) => ({
      ...row,
      metadata: this.redactMetadata(row.metadata),
    }));

    return { data, total, page, limit };
  }

  private redactMetadata(
    metadata: Record<string, unknown> | undefined | null,
  ): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      redacted[key] = REDACTED_METADATA_KEYS.has(key) ? '[redacted]' : value;
    }
    return redacted;
  }

  private boundedInteger(
    value: number | string | undefined,
    fallback: number,
    maximum: number,
    field: string,
  ): number {
    if (value === undefined) return fallback;
    const parsed =
      typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (
      typeof parsed !== 'number' ||
      !Number.isInteger(parsed) ||
      parsed < 1 ||
      parsed > maximum
    ) {
      throw new BadRequestException(
        `${field} must be an integer between 1 and ${maximum}`,
      );
    }
    return parsed;
  }

  private boundedText(
    value: string | undefined,
    maximumLength: number,
    field: string,
  ): string | undefined {
    if (value === undefined) return undefined;
    const normalized = value.trim();
    if (normalized.length > maximumLength) {
      throw new BadRequestException(
        `${field} cannot exceed ${maximumLength} characters`,
      );
    }
    return normalized || undefined;
  }

  private validDate(value: string, field: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return parsed;
  }

  private toDocument(input: AppendActivityInput) {
    return {
      occurred_at: input.occurred_at ?? new Date(),
      actor_type: input.actor_type,
      actor_id: input.actor_id,
      actor_label: input.actor_label,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      summary: input.summary,
      metadata: input.metadata ?? {},
    };
  }
}
