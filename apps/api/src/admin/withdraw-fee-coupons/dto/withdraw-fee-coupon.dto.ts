import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { WITHDRAW_FEE_DISCOUNT_MODES } from 'src/withdraw/schemas/withdraw-fee-coupon.schema';

export class CreateWithdrawFeeCouponDto {
  @ApiProperty({ example: 'GOGOFEE10' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'code must be alphanumeric',
  })
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: WITHDRAW_FEE_DISCOUNT_MODES })
  @IsIn([...WITHDRAW_FEE_DISCOUNT_MODES])
  discount_mode!: (typeof WITHDRAW_FEE_DISCOUNT_MODES)[number];

  @ApiPropertyOptional({ description: 'Required for fixed/percent modes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  discount_value?: number;

  @ApiPropertyOptional({ default: 'THB' })
  @IsOptional()
  @IsIn(['THB', 'USD'])
  currency?: string;

  @ApiProperty()
  @IsDateString()
  start_at!: string;

  @ApiProperty()
  @IsDateString()
  end_at!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  unlimited_quantity?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  usage_per_user?: number;

  @ApiPropertyOptional({ type: [String], default: ['bank_transfer'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applies_to?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_withdraw_amount?: number;
}

export class UpdateWithdrawFeeCouponDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: WITHDRAW_FEE_DISCOUNT_MODES })
  @IsOptional()
  @IsIn([...WITHDRAW_FEE_DISCOUNT_MODES])
  discount_mode?: (typeof WITHDRAW_FEE_DISCOUNT_MODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  discount_value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['THB', 'USD'])
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  unlimited_quantity?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  usage_per_user?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applies_to?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_withdraw_amount?: number;
}
