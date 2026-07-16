import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Types } from 'mongoose';
import { CreateOfferDto } from './create-offer.dto';

export class UpdateOfferDto extends PartialType(CreateOfferDto) {}

export class UpdateCouponDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Optional when coupons are issued without a redeem code. */
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
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

  @IsOptional()
  @IsString()
  @MaxLength(8)
  start_time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  end_time?: string;

  @IsOptional()
  @IsString()
  eligibility?: string;

  @IsOptional()
  @IsString()
  min_spend?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  min_spend_currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_cap?: number;

  @IsOptional()
  @IsBoolean()
  max_cap_enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  max_cap_currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsIn(['percent', 'cash'])
  discount_type?: 'percent' | 'cash';

  @IsOptional()
  @IsString()
  @MaxLength(12)
  discount_currency?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  disabled?: string | boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  unlimited_amount_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  one_time_use_enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usage_per_user?: number;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  terms_and_conditions?: string;
}
