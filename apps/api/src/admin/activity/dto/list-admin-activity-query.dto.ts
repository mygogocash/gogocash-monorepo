import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ADMIN_ACTIVITY_MAX_PAGE = 100_000;
export const ADMIN_ACTIVITY_MAX_LIMIT = 100;
export const ADMIN_ACTIVITY_MAX_SEARCH_LENGTH = 100;
export const ADMIN_ACTIVITY_MAX_FILTER_LENGTH = 200;

export class ListAdminActivityQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: ADMIN_ACTIVITY_MAX_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_ACTIVITY_MAX_PAGE)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: ADMIN_ACTIVITY_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_ACTIVITY_MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ADMIN_ACTIVITY_MAX_FILTER_LENGTH)
  actor_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ADMIN_ACTIVITY_MAX_FILTER_LENGTH)
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ADMIN_ACTIVITY_MAX_FILTER_LENGTH)
  entity_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ADMIN_ACTIVITY_MAX_FILTER_LENGTH)
  entity_id?: string;

  @ApiPropertyOptional({ maxLength: ADMIN_ACTIVITY_MAX_SEARCH_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(ADMIN_ACTIVITY_MAX_SEARCH_LENGTH)
  search?: string;
}
