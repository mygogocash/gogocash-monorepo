import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class DiscoverReorderDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  order: string[];
}

export class DiscoverAddItemDto {
  @ApiProperty()
  @IsString()
  offer_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  custom_title?: string;
}

export class DiscoverUpdateItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  custom_title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
