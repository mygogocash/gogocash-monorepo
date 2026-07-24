import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { INVOLVE_SHOP_TYPES } from '../schemas/involve-shop.schema';

// #586 REQ-API-1 — GET /explore/shops query. Global ValidationPipe
// (transform + whitelist + forbidNonWhitelisted) coerces types and 400s on
// unknown/invalid params.
export class ExploreShopsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string;

  @IsOptional()
  @IsEnum(INVOLVE_SHOP_TYPES)
  shopType?: (typeof INVOLVE_SHOP_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  cashbackMin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  // #503 — scope the rail to one platform brand's shops (brand-detail page).
  @IsOptional()
  @IsMongoId()
  platformOfferId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(['highest_cashback', 'latest'])
  sort?: 'highest_cashback' | 'latest';
}

// #586 REQ-API-2 — GET /explore/deals query.
export class ExploreDealsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
