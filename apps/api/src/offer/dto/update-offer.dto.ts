import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';
import { CreateOfferDto } from './create-offer.dto';

export class UpdateOfferDto extends PartialType(CreateOfferDto) {}

function normalizeStrictBoolean(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function normalizeStrictNumber(value: unknown): unknown {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Number(value);
  return value;
}

export class UpdateCouponDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  description?: string;

  /** Required only when the coupon exposes a redeem code. */
  @ValidateIf(
    (object: UpdateCouponDto, value) =>
      object.code_enabled === true || (value !== undefined && value !== ''),
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  code?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  code_enabled?: boolean;

  @IsNotEmpty()
  @IsString()
  offer_id: string | Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @ValidateIf((_object, value) => value !== undefined && value !== '')
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start_time?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== '')
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end_time?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  eligibility?: string;

  // Unlike @IsOptional(), this deliberately validates null. A present coupon
  // value must be a string; only an omitted field preserves legacy sparsity.
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  min_spend?: string;

  @ValidateIf(
    (object: UpdateCouponDto, value) =>
      (typeof object.min_spend === 'string' &&
        object.min_spend.trim().length > 0) ||
      (value !== undefined && value !== ''),
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(12)
  min_spend_currency?: string;

  @ValidateIf(
    (object: UpdateCouponDto, value) =>
      object.max_cap_enabled === true || (value !== undefined && value !== 0),
  )
  @Transform(({ value }) => normalizeStrictNumber(value))
  @IsNumber()
  @IsPositive()
  max_cap?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  max_cap_enabled?: boolean;

  @ValidateIf(
    (object: UpdateCouponDto, value) =>
      object.max_cap_enabled === true || (value !== undefined && value !== ''),
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(12)
  max_cap_currency?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => normalizeStrictNumber(value))
  @IsNumber()
  discount?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['percent', 'cash'])
  discount_type?: 'percent' | 'cash';

  @ValidateIf(
    (object: UpdateCouponDto, value) =>
      object.discount_type === 'cash' || (value !== undefined && value !== ''),
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(12)
  discount_currency?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  id?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => normalizeStrictBoolean(value))
  @IsBoolean()
  disabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => normalizeStrictNumber(value))
  @IsNumber()
  quantity?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  unlimited_amount_enabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  one_time_use_enabled?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => normalizeStrictNumber(value))
  @IsInt()
  @Min(1)
  usage_per_user?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  link?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(50_000)
  terms_and_conditions?: string;
}
