import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Payload for `POST /brand` — creates a new parent Brand entity. Country
 * variants remain represented by Offer records linked through `brand_id`.
 */
export class CreateBrandDto {
  @ApiProperty({ example: 'Apple' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  brand_name: string;

  @ApiPropertyOptional({ example: 'apple' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand_slug?: string;

  @ApiPropertyOptional({ example: 'Thailand' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
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
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: 'apple-store' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  shop_slug?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  shop_status?: 'draft' | 'published' | 'archived';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  shop_visible?: boolean;

  @ApiPropertyOptional({ enum: ['gogocash'] })
  @IsOptional()
  @IsEnum(['gogocash'])
  fulfillment_owner?: 'gogocash';

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  support_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  support_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  return_policy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shipping_policy?: string;
}
