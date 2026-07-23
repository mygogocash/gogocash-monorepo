import { Module } from '@nestjs/common';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { GolinkController } from './golink.controller';
import { GolinkPreviewService } from './golink-preview.service';

@Module({
  controllers: [GolinkController],
  providers: [GolinkPreviewService, RateLimitGuard],
})
export class GolinkModule {}
