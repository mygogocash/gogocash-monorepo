import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsIn,
  IsMongoId,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SEARCH_RULE_TREATMENTS,
  type SearchRuleTreatment,
} from '../search-rule.contract';

export class CreateSearchRuleDto {
  @ApiProperty()
  @IsMongoId()
  offer_id: string;

  @ApiProperty({ enum: SEARCH_RULE_TREATMENTS })
  @IsIn(SEARCH_RULE_TREATMENTS)
  treatment: SearchRuleTreatment;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  keywords: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateSearchRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  offer_id?: string;

  @ApiPropertyOptional({ enum: SEARCH_RULE_TREATMENTS })
  @IsOptional()
  @IsIn(SEARCH_RULE_TREATMENTS)
  treatment?: SearchRuleTreatment;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  keywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateFeaturedTermDto {
  @ApiPropertyOptional() @IsString() term: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sort_order?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class UpdateFeaturedTermDto {
  @ApiPropertyOptional() @IsOptional() @IsString() term?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sort_order?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class ReorderTermsDto {
  @IsArray() order: string[];
}

export class CreateBoostRuleDto {
  @IsString() offer_id: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() boost_weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class UpdateBoostRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() offer_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() boost_weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class CreateBlacklistDto {
  @IsString() term: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class BulkImportBlacklistDto {
  @IsArray() keywords: string[];
}
