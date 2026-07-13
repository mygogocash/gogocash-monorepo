import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';
import { RateLimit } from 'src/auth/rate-limit.decorator';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { GolinkPreviewService } from './golink-preview.service';

class GolinkPreviewDto {
  @ApiProperty({ example: 'https://s.shopee.co.th/1qaOl0dAf5' })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url!: string;
}

@ApiTags('golink')
@Controller('golink')
export class GolinkController {
  constructor(private readonly previewService: GolinkPreviewService) {}

  @Post('preview')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 30 })
  @ApiBody({ type: GolinkPreviewDto })
  @ApiResponse({
    status: 201,
    description: 'Open Graph preview for a marketplace URL',
  })
  async preview(@Body() body: GolinkPreviewDto) {
    return this.previewService.preview(body.url);
  }
}
