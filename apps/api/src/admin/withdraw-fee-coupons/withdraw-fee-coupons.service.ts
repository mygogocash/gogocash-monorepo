import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WithdrawFeeCoupon,
  WithdrawFeeDiscountMode,
} from 'src/withdraw/schemas/withdraw-fee-coupon.schema';
import { normalizeWithdrawFeeCouponCode } from 'src/withdraw/resolve-withdraw-fee';
import {
  CreateWithdrawFeeCouponDto,
  UpdateWithdrawFeeCouponDto,
} from './dto/withdraw-fee-coupon.dto';
import { AdminActivityService } from '../activity/admin-activity.service';
import { AdminActor } from '../activity/admin-activity.actor';
import { escapeRegexLiteral } from 'src/common/escape-regex';

@Injectable()
export class WithdrawFeeCouponsService {
  constructor(
    @InjectModel(WithdrawFeeCoupon.name)
    private readonly couponModel: Model<WithdrawFeeCoupon>,
    private readonly adminActivity: AdminActivityService,
  ) {}

  async list(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (params.search?.trim()) {
      const q = escapeRegexLiteral(params.search.trim().slice(0, 100));
      filter.$or = [
        { code: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.couponModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.couponModel.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async create(dto: CreateWithdrawFeeCouponDto, actor: AdminActor) {
    this.assertDiscountValue(dto.discount_mode, dto.discount_value);
    const unlimited = dto.unlimited_quantity ?? true;
    this.assertQuantity(unlimited, dto.quantity);
    this.assertUsagePerUser(dto.usage_per_user ?? 1);
    const code = normalizeWithdrawFeeCouponCode(dto.code);
    const startAt = new Date(dto.start_at);
    const endAt = new Date(dto.end_at);
    if (!(startAt < endAt)) {
      throw new BadRequestException('start_at must be before end_at');
    }
    try {
      const created = await this.couponModel.create({
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        discount_mode: dto.discount_mode,
        discount_value:
          dto.discount_mode === 'waive' ? 0 : Number(dto.discount_value ?? 0),
        currency: (dto.currency || 'THB').toUpperCase(),
        start_at: startAt,
        end_at: endAt,
        disabled: dto.disabled ?? false,
        quantity: unlimited ? undefined : dto.quantity,
        quantity_used: 0,
        unlimited_quantity: unlimited,
        usage_per_user: dto.usage_per_user ?? 1,
        applies_to: dto.applies_to?.length ? dto.applies_to : ['bank_transfer'],
        min_withdraw_amount: dto.min_withdraw_amount,
      });
      const createdObj = created.toObject();
      await this.adminActivity.append({
        actor_type: 'admin',
        actor_id: actor.id,
        actor_label: actor.label,
        action: 'fee_coupon.created',
        entity_type: 'withdraw_fee_coupon',
        entity_id: String(createdObj._id),
        summary: `Created fee coupon ${code}`,
        metadata: {
          code,
          discount_mode: dto.discount_mode,
          currency: createdObj.currency,
        },
      });
      return createdObj;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000
      ) {
        throw new ConflictException(`Coupon code ${code} already exists`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateWithdrawFeeCouponDto, actor: AdminActor) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid coupon id');
    }
    const existing = await this.couponModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    const discountMode = dto.discount_mode ?? existing.discount_mode;
    const discountValue =
      dto.discount_value !== undefined
        ? dto.discount_value
        : existing.discount_value;
    this.assertDiscountValue(discountMode, discountValue);

    if (dto.start_at || dto.end_at) {
      const startAt = new Date(dto.start_at ?? existing.start_at);
      const endAt = new Date(dto.end_at ?? existing.end_at);
      if (!(startAt < endAt)) {
        throw new BadRequestException('start_at must be before end_at');
      }
      existing.start_at = startAt;
      existing.end_at = endAt;
    }

    if (dto.name !== undefined) existing.name = dto.name.trim();
    if (dto.description !== undefined) {
      existing.description = dto.description.trim() || undefined;
    }
    if (dto.discount_mode !== undefined)
      existing.discount_mode = dto.discount_mode;
    if (dto.discount_value !== undefined) {
      existing.discount_value =
        discountMode === 'waive' ? 0 : Number(dto.discount_value);
    } else if (dto.discount_mode === 'waive') {
      existing.discount_value = 0;
    }
    if (dto.currency !== undefined)
      existing.currency = dto.currency.toUpperCase();
    if (dto.disabled !== undefined) existing.disabled = dto.disabled;
    if (dto.unlimited_quantity !== undefined) {
      existing.unlimited_quantity = dto.unlimited_quantity;
    }
    if (dto.quantity !== undefined) existing.quantity = dto.quantity;
    const nextUnlimited =
      dto.unlimited_quantity !== undefined
        ? dto.unlimited_quantity
        : existing.unlimited_quantity;
    const nextQuantity =
      dto.quantity !== undefined ? dto.quantity : existing.quantity;
    this.assertQuantity(nextUnlimited, nextQuantity);
    if (dto.usage_per_user !== undefined) {
      this.assertUsagePerUser(dto.usage_per_user);
      existing.usage_per_user = dto.usage_per_user;
    }
    if (dto.applies_to !== undefined) existing.applies_to = dto.applies_to;
    if (dto.min_withdraw_amount !== undefined) {
      existing.min_withdraw_amount = dto.min_withdraw_amount;
    }

    await existing.save();
    const updated = existing.toObject();
    await this.adminActivity.append({
      actor_type: 'admin',
      actor_id: actor.id,
      actor_label: actor.label,
      action: 'fee_coupon.updated',
      entity_type: 'withdraw_fee_coupon',
      entity_id: String(existing._id),
      summary: `Updated fee coupon ${existing.code}`,
      metadata: {
        code: existing.code,
        disabled: existing.disabled,
        discount_mode: existing.discount_mode,
      },
    });
    return updated;
  }

  private assertDiscountValue(
    mode: WithdrawFeeDiscountMode,
    value: number | undefined,
  ): void {
    if (mode === 'waive') {
      return;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        'discount_value is required for fixed/percent modes',
      );
    }
    if (mode === 'percent' && value > 100) {
      throw new BadRequestException('percent discount_value cannot exceed 100');
    }
  }

  private assertQuantity(
    unlimited: boolean,
    quantity: number | undefined,
  ): void {
    if (unlimited) {
      return;
    }
    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      throw new BadRequestException(
        'quantity must be a positive integer when unlimited_quantity is false',
      );
    }
  }

  private assertUsagePerUser(value: number): void {
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      throw new BadRequestException(
        'usage_per_user must be an integer between 1 and 1000',
      );
    }
  }
}
