import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export const activationSources = [
  'gototrack',
  'gototrack_background_prompt',
  'gototrack_agent',
  'golink',
  'shop_detail',
  'line',
] as const;

export type ActivationSource = (typeof activationSources)[number];

export class ActivationRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detectionEventId?: string;

  @ApiProperty()
  @IsString()
  merchantId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  offerId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  networkMerchantId: number;

  @ApiProperty({ enum: activationSources })
  @IsIn(activationSources)
  source: ActivationSource;
}
