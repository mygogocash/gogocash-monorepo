import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsNumberString,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SubscriptionQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Items per page', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Search by email or username' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (active/paused/cancelled/expired)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by plan ID' })
  @IsOptional()
  @IsString()
  planId?: string;
}

export class CreateSubscriptionPlanDto {
  @ApiProperty({ description: 'Plan name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Plan description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'THB' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Billing cycle',
    enum: ['monthly', 'quarterly', 'yearly'],
  })
  @IsIn(['monthly', 'quarterly', 'yearly'])
  billing_cycle: string;

  @ApiPropertyOptional({ description: 'Feature list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Trial days', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trial_days?: number;

  @ApiPropertyOptional({ description: 'Is plan active', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  is_active?: boolean;
}

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional({ description: 'Plan name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Billing cycle',
    enum: ['monthly', 'quarterly', 'yearly'],
  })
  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  billing_cycle?: string;

  @ApiPropertyOptional({ description: 'Feature list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Trial days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trial_days?: number;

  @ApiPropertyOptional({ description: 'Is plan active' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  is_active?: boolean;
}

export class SubscriptionActionDto {
  @ApiPropertyOptional({
    description: 'Number of days to extend (for extend action)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  days?: number;
}
