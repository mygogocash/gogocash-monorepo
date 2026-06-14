import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Payload for `POST /brand` — creates a new parent Brand entity. Country variants
 * (Offer rows) are added separately via `POST /offer` with `brand_id` referencing
 * the new brand, OR via `POST /brand/:id/variant` which delegates to the same path.
 */
export class CreateBrandDto {
  @ApiProperty({ example: 'Apple' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  brand_name: string;

  /**
   * URL-safe slug. When omitted, the service generates one from `brand_name`.
   * Must be unique across the brands collection.
   */
  @ApiPropertyOptional({ example: 'apple' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand_slug?: string;

  @ApiPropertyOptional({
    description:
      'Fallback country variant when a global brand is opened by a user whose country has no dedicated variant.',
    example: 'Thailand',
  })
  @IsOptional()
  @IsString()
  default_country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_global?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo_circle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  banner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categories?: string;
}
