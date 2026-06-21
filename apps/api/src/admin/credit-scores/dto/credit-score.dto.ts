import {
  IsOptional,
  IsString,
  IsNumber,
  IsNumberString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreditScoreQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by credit tier' })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional({ description: 'Minimum credit score' })
  @IsOptional()
  @IsNumberString()
  minScore?: string;

  @ApiPropertyOptional({ description: 'Maximum credit score' })
  @IsOptional()
  @IsNumberString()
  maxScore?: string;
}

class CreditScoreTierDto {
  @ApiProperty({ description: 'Tier name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Minimum score for this tier' })
  @IsNumber()
  min_score: number;

  @ApiProperty({ description: 'Maximum score for this tier' })
  @IsNumber()
  max_score: number;

  @ApiProperty({ description: 'Tier color (hex or name)' })
  @IsString()
  color: string;

  @ApiPropertyOptional({ description: 'Tier benefits', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];
}

class CreditScoreWeightsDto {
  @ApiPropertyOptional({ description: 'Weight for conversion count' })
  @IsOptional()
  @IsNumber()
  conversion_count?: number;

  @ApiPropertyOptional({ description: 'Weight for total spend' })
  @IsOptional()
  @IsNumber()
  total_spend?: number;

  @ApiPropertyOptional({ description: 'Weight for referral count' })
  @IsOptional()
  @IsNumber()
  referral_count?: number;

  @ApiPropertyOptional({ description: 'Weight for account age in days' })
  @IsOptional()
  @IsNumber()
  account_age_days?: number;
}

export class UpdateCreditScoreConfigDto {
  @ApiPropertyOptional({
    description: 'Credit score tiers',
    type: [CreditScoreTierDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditScoreTierDto)
  tiers?: CreditScoreTierDto[];

  @ApiPropertyOptional({ description: 'Scoring weights' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreditScoreWeightsDto)
  weights?: CreditScoreWeightsDto;

  @ApiPropertyOptional({ description: 'Maximum possible score', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_score?: number;
}

export class OverrideCreditScoreDto {
  @ApiProperty({ description: 'New credit score value' })
  @IsNumber()
  @Min(0)
  newScore: number;

  @ApiProperty({ description: 'Reason for the override' })
  @IsString()
  reason: string;
}
