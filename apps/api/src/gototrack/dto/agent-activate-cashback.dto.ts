import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AgentActivateCashbackDto {
  @ApiProperty()
  @IsString()
  detectionEventId: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  merchantName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageName?: string;

  @ApiPropertyOptional({
    description: 'Optional agent conversation id for analytics only',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
