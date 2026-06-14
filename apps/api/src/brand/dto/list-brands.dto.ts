import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * `GET /brand` query parameters. All optional. The service returns brands
 * with a `variants` array populated from the offers collection so the admin
 * grouped table can render Apple → [TH, SG] in one round-trip.
 */
export class ListBrandsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  /** Substring match on `brand_name` (case-insensitive). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  /** When `'true'`, only return brands flagged global. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  is_global?: string;

  /** Filter brands that have at least one variant in this country. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;
}
