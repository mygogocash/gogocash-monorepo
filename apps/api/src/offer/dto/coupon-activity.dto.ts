import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const SAFE_EVENT_ID = /^[A-Za-z0-9._:-]+$/;

export class RecordCouponEngagementDto {
  @IsIn(['view', 'copy'])
  eventType: 'view' | 'copy';

  @IsString()
  @Length(8, 128)
  @Matches(SAFE_EVENT_ID)
  eventId: string;
}

export class RecordCouponRedemptionDto {
  @IsString()
  @Length(3, 128)
  @Matches(SAFE_EVENT_ID)
  referenceId: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  userId?: string;

  @IsOptional()
  @IsEmail()
  @Length(3, 254)
  userEmail?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  occurredAt?: string;
}

export class CouponInsightsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
