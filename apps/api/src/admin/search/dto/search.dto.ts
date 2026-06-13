import { IsOptional, IsString, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
