import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import type {
  CatalogBannerCtaType,
  CatalogBannerDevice,
  CatalogBannerPlacement,
  CatalogBannerStatus,
} from '../schemas/catalog-banner.schema';
import type { CatalogProductStatus } from '../schemas/catalog-product.schema';
import type { CommerceOrderStatus } from '../schemas/order.schema';

const currencyPattern = /^[A-Z]{3}$/;

export class ListCatalogDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  placement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shop_slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateCatalogBannerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  subtitle?: string;

  @IsUrl({ require_tld: false })
  image_url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  image_alt?: string;

  @IsEnum(['home_hero', 'home_grid', 'shop_list', 'product_detail', 'modal'])
  placement!: CatalogBannerPlacement;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  locale?: string;

  @IsOptional()
  @IsEnum(['all', 'mobile', 'tablet', 'desktop'])
  device?: CatalogBannerDevice;

  @IsOptional()
  @IsEnum(['none', 'shop', 'product', 'offer', 'url'])
  cta_type?: CatalogBannerCtaType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cta_value?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: CatalogBannerStatus;

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  @IsOptional()
  @IsDateString()
  ends_at?: string;
}

export class UpdateCatalogBannerDto extends CreateCatalogBannerDto {
  @IsOptional()
  title!: string;

  @IsOptional()
  image_url!: string;

  @IsOptional()
  placement!: CatalogBannerPlacement;
}

export class CatalogProductVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sku!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_amount!: number;

  @Matches(currencyPattern)
  currency!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  inventory_quantity!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsUrl({ require_tld: false })
  image_url?: string;
}

export class CreateCatalogProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsMongoId()
  brand_id!: string;

  @IsOptional()
  @IsMongoId()
  offer_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  shop_slug?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  default_sku!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_amount!: number;

  @Matches(currencyPattern)
  currency!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  inventory_quantity!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ require_tld: false }, { each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CatalogProductVariantDto)
  variants?: CatalogProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: CatalogProductStatus;

  @IsOptional()
  @IsDateString()
  scheduled_start_at?: string;

  @IsOptional()
  @IsDateString()
  scheduled_end_at?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  seo_title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  seo_description?: string;
}

export class UpdateCatalogProductDto extends CreateCatalogProductDto {
  @IsOptional()
  title!: string;

  @IsOptional()
  slug!: string;

  @IsOptional()
  brand_id!: string;

  @IsOptional()
  default_sku!: string;

  @IsOptional()
  price_amount!: number;

  @IsOptional()
  currency!: string;

  @IsOptional()
  inventory_quantity!: number;
}

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  shop_slug?: string;

  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  shop_status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsBoolean()
  shop_visible?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  fulfillment_owner?: 'gogocash';

  @IsOptional()
  @IsString()
  @MaxLength(180)
  support_email?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  support_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  return_policy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shipping_policy?: string;
}

export class UpsertCartItemDto {
  @IsMongoId()
  product_id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  variant_sku!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class CreateCheckoutSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  idempotency_key?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  success_url?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  cancel_url?: string;

  @IsOptional()
  @IsObject()
  shipping_address?: Record<string, unknown>;
}

export class UpdateOrderStatusDto {
  @IsEnum(['processing', 'fulfilled', 'cancelled', 'refunded'])
  status!: CommerceOrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  admin_note?: string;
}

export class CreateMediaUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  filename!: string;

  @IsEnum(['image/png', 'image/jpeg', 'image/webp'])
  content_type!: 'image/png' | 'image/jpeg' | 'image/webp';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5_242_880)
  size_bytes!: number;

  @IsEnum(['banner', 'brand', 'shop', 'product'])
  folder!: 'banner' | 'brand' | 'shop' | 'product';
}
