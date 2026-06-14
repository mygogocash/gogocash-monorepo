import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ReferralQueryDto {
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
}

export class UpdateReferralConfigDto {
  @ApiPropertyOptional({ description: 'Enable or disable referral program' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Reward type', default: 'points' })
  @IsOptional()
  @IsString()
  reward_type?: string;

  @ApiPropertyOptional({ description: 'Reward for the referrer', default: 100 })
  @IsOptional()
  @IsNumber()
  referrer_reward?: number;

  @ApiPropertyOptional({ description: 'Reward for the referee', default: 50 })
  @IsOptional()
  @IsNumber()
  referee_reward?: number;

  @ApiPropertyOptional({ description: 'Currency for rewards', default: 'points' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Max referrals per user (0 = unlimited)',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  max_referrals_per_user?: number;

  @ApiPropertyOptional({ description: 'Require admin approval for referrals' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  require_approval?: boolean;
}
