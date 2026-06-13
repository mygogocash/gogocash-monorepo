import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsNumberString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class MembershipQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by tier ID' })
  @IsOptional()
  @IsString()
  tierId?: string;

  @ApiPropertyOptional({ description: 'Filter by status (active/cancelled/expired)' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateMembershipTierDto {
  @ApiProperty({ description: 'Tier name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Tier price', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'THB' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Benefits list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ description: 'Cashback bonus percentage', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashback_bonus_percent?: number;

  @ApiPropertyOptional({ description: 'Is tier active', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

export class UpdateMembershipTierDto {
  @ApiPropertyOptional({ description: 'Tier name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Tier price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Benefits list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ description: 'Cashback bonus percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashback_bonus_percent?: number;

  @ApiPropertyOptional({ description: 'Is tier active' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

export class ChangeTierDto {
  @ApiProperty({ description: 'New tier ID' })
  @IsString()
  tierId: string;
}

export class CancelMembershipDto {
  @ApiProperty({ description: 'Cancellation reason' })
  @IsString()
  reason: string;
}
