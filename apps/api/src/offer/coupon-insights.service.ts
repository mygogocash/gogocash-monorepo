import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { requireObjectId } from 'src/common/mongo-query';
import {
  CouponInsightsQueryDto,
  RecordCouponEngagementDto,
  RecordCouponRedemptionDto,
} from './dto/coupon-activity.dto';
import { CouponActivity } from './schemas/coupon-activity.schema';
import { Coupon } from './schemas/coupon.schema';

type CouponInsightDocument = {
  _id: Types.ObjectId | string;
  code?: string;
  discount?: number;
  name: string;
  offer_id?:
    | Types.ObjectId
    | {
        offer_name?: string;
        offer_name_display?: string;
      };
  quantity_used?: number;
};

type RedemptionActivityDocument = {
  _id: Types.ObjectId | string;
  occurred_at: Date | string;
  reference_id?: string;
};

type RedemptionActor = {
  adminEmail?: string;
  adminId: string;
};

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function offerNameOf(offer: CouponInsightDocument['offer_id']): string {
  if (!offer || offer instanceof Types.ObjectId) return '';
  return offer.offer_name_display?.trim() || offer.offer_name?.trim() || '';
}

@Injectable()
export class CouponInsightsService {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<Coupon>,
    @InjectModel(CouponActivity.name)
    private readonly activityModel: Model<CouponActivity>,
  ) {}

  async recordEngagement(
    id: string,
    dto: RecordCouponEngagementDto,
  ): Promise<{ recorded: boolean }> {
    const couponId = requireObjectId(id, 'coupon id');
    await this.requireCoupon(couponId);
    const dedupeKey = `${couponId.toHexString()}:${dto.eventType}:${dto.eventId}`;

    try {
      const result = await this.activityModel.updateOne(
        { dedupe_key: dedupeKey },
        {
          $setOnInsert: {
            coupon_id: couponId,
            dedupe_key: dedupeKey,
            event_type: dto.eventType,
            occurred_at: new Date(),
          },
        },
        { upsert: true },
      );
      return { recorded: result.upsertedCount === 1 };
    } catch (error) {
      if (isDuplicateKeyError(error)) return { recorded: false };
      throw error;
    }
  }

  async recordRedemption(
    id: string,
    dto: RecordCouponRedemptionDto,
    actor: RedemptionActor,
  ): Promise<{ recorded: boolean }> {
    const couponId = requireObjectId(id, 'coupon id');
    await this.requireCoupon(couponId);
    const dedupeKey = `${couponId.toHexString()}:redemption:${dto.referenceId}`;
    let recorded = false;

    try {
      const result = await this.activityModel.updateOne(
        { dedupe_key: dedupeKey },
        {
          $setOnInsert: {
            coupon_id: couponId,
            dedupe_key: dedupeKey,
            event_type: 'redemption',
            occurred_at: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
            reference_id: dto.referenceId,
            recorded_by_admin_email: actor.adminEmail,
            recorded_by_admin_id: actor.adminId,
            user_email: dto.userEmail,
            user_id: dto.userId,
          },
        },
        { upsert: true },
      );
      recorded = result.upsertedCount === 1;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }

    // Keep the operational coupon counter at least as high as the auditable
    // event count. `$max` preserves any legacy quantity_used baseline that
    // predates coupon_activities instead of silently reducing it.
    const trackedRedemptions = await this.activityModel.countDocuments({
      coupon_id: couponId,
      event_type: 'redemption',
    });
    await this.couponModel.updateOne({ _id: couponId }, [
      {
        $set: {
          quantity_used: {
            $max: [{ $ifNull: ['$quantity_used', 0] }, trackedRedemptions],
          },
        },
      },
    ]);

    return { recorded };
  }

  async getInsights(id: string, query: CouponInsightsQueryDto) {
    const couponId = requireObjectId(id, 'coupon id');
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const coupon = (await this.couponModel
      .findById(couponId)
      .select('name code discount quantity_used offer_id')
      .populate('offer_id', 'offer_name offer_name_display')
      .lean()) as CouponInsightDocument | null;

    if (!coupon) {
      throw new NotFoundException('Coupon not found.');
    }

    const activityFilter = { coupon_id: couponId };
    const redemptionFilter = {
      ...activityFilter,
      event_type: 'redemption' as const,
    };
    const [detailViews, codeCopies, redemptionTotal, redemptionRows] =
      await Promise.all([
        this.activityModel.countDocuments({
          ...activityFilter,
          event_type: 'view',
        }),
        this.activityModel.countDocuments({
          ...activityFilter,
          event_type: 'copy',
        }),
        this.activityModel.countDocuments(redemptionFilter),
        this.activityModel
          .find(redemptionFilter)
          .sort({ occurred_at: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

    const legacyUsage = Number.isFinite(Number(coupon.quantity_used))
      ? Math.max(0, Number(coupon.quantity_used))
      : 0;
    const usageAmount = Math.max(legacyUsage, redemptionTotal);
    const copyRate =
      detailViews > 0
        ? Number(((codeCopies / detailViews) * 100).toFixed(1))
        : 0;

    return {
      coupon: {
        code: coupon.code ?? '',
        discount: coupon.discount ?? 0,
        id: String(coupon._id),
        name: coupon.name,
        offerName: offerNameOf(coupon.offer_id),
      },
      metrics: {
        codeCopies,
        copyRate,
        detailViews,
        usageAmount,
        usageUnit: 'redemptions' as const,
      },
      redemptions: {
        data: (redemptionRows as unknown as RedemptionActivityDocument[]).map(
          (row) => ({
            id: String(row._id),
            referenceId: row.reference_id ?? '',
            status: 'redeemed' as const,
            usedAt: new Date(row.occurred_at).toISOString(),
          }),
        ),
        limit,
        page,
        total: redemptionTotal,
        totalPages:
          redemptionTotal > 0 ? Math.ceil(redemptionTotal / limit) : 0,
      },
    };
  }

  private async requireCoupon(couponId: Types.ObjectId): Promise<void> {
    const exists = await this.couponModel.exists({ _id: couponId });
    if (!exists) throw new NotFoundException('Coupon not found.');
  }
}
