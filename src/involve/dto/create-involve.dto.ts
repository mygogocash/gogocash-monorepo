// src/offers/dto/offer.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

class Commission {
  // If you need dynamic keys, do not use decorators on them
  [key: string]: string;
}

class SpecialCommission {}

export class OfferDto {
  @IsInt()
  offer_id: number;

  @IsInt()
  merchant_id: number;

  @IsString()
  offer_name: string;

  @IsString()
  description: string;

  @IsString()
  preview_url: string;

  @IsInt()
  is_require_approval: number;

  @IsString()
  currency: string;

  @IsString()
  logo: string;

  @IsString()
  lookup_value: string;

  @IsInt()
  validation_terms: number;

  @IsInt()
  payment_terms: number;

  @IsString()
  datetime_updated: string;

  @IsString()
  datetime_created: string;

  @IsBoolean()
  marketplace_store_offer: boolean;

  @IsString()
  categories: string;

  @IsString()
  countries: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Commission)
  commissions: Commission[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecialCommission)
  special_commissions: SpecialCommission[];

  @IsString()
  tracking_link: string;

  @IsString()
  commission_tracking: string;

  @IsString()
  tracking_type: string;

  @IsString()
  directory_page: string;
}

export class CreateAffiliateDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  offer_id: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty()
  merchant_id: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  deeplink: string;
}
