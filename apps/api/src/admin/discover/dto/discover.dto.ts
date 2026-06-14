import { IsOptional, IsString, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReorderItemsDto {
  @ApiProperty({
    description: 'Ordered array of offer_id strings',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  order: string[];
}

export class AddDiscoverItemDto {
  @ApiProperty({ description: 'Offer ID' })
  @IsString()
  offer_id: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ description: 'Custom title for the item' })
  @IsOptional()
  @IsString()
  custom_title?: string;
}

export class UpdateDiscoverItemDto {
  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ description: 'Custom title for the item' })
  @IsOptional()
  @IsString()
  custom_title?: string;
}
