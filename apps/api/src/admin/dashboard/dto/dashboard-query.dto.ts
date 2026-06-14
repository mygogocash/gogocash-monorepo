import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardInsightsQueryDto {
  @ApiPropertyOptional({
    description: 'Time range: 7d, 30d, 90d',
    default: '30d',
  })
  @IsOptional()
  @IsString()
  range?: string;
}
