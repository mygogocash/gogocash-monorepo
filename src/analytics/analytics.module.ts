import { Global, Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { FeatureFlagsService } from './feature-flags.service';

@Global()
@Module({
  providers: [AnalyticsService, FeatureFlagsService],
  exports: [AnalyticsService, FeatureFlagsService],
})
export class AnalyticsModule {}
