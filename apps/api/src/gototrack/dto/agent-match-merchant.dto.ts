import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { detectionPlatforms } from './detection-request.dto';

export class AgentMatchMerchantDto {
  @ApiPropertyOptional({
    description: 'Natural-language merchant name, e.g. "Shopee"',
  })
  @IsOptional()
  @IsString()
  merchantHint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageName?: string;

  @ApiPropertyOptional({ enum: detectionPlatforms, default: 'web' })
  @IsOptional()
  @IsIn(detectionPlatforms)
  platform?: (typeof detectionPlatforms)[number];

  @ApiPropertyOptional({
    description: 'Optional agent conversation id for analytics only',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
