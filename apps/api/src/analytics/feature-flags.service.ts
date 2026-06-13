import { Injectable } from '@nestjs/common';
import { AnalyticsContext } from './analytics-context';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly analytics: AnalyticsService) {}

  isEnabled(
    flagKey: string,
    context: AnalyticsContext,
    personProperties: Record<string, unknown> = {},
  ) {
    return this.analytics.isFeatureEnabled(flagKey, context, personProperties);
  }

  getPayload<T = unknown>(
    flagKey: string,
    context: AnalyticsContext,
    personProperties: Record<string, unknown> = {},
  ) {
    return this.analytics.getFeatureFlagPayload<T>(
      flagKey,
      context,
      personProperties,
    );
  }
}
