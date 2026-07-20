import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { AnalyticsContext, getAnalyticsDistinctId } from './analytics-context';

type AnalyticsProperties = Record<string, unknown>;
type AnalyticsFlagProperties = Record<string, string>;

const compactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map((item) => compactValue(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as AnalyticsProperties)
      .map(([key, entry]) => [key, compactValue(entry)] as const)
      .filter(([, entry]) => entry !== undefined);

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value;
};

const compactFlagProperties = (
  properties: AnalyticsProperties,
): AnalyticsFlagProperties => {
  const entries = Object.entries(properties)
    .map(([key, value]) => {
      const compacted = compactValue(value);

      if (compacted === undefined) {
        return undefined;
      }

      if (typeof compacted === 'string') {
        return [key, compacted] as const;
      }

      if (
        typeof compacted === 'number' ||
        typeof compacted === 'boolean' ||
        typeof compacted === 'bigint'
      ) {
        return [key, String(compacted)] as const;
      }

      try {
        return [key, JSON.stringify(compacted)] as const;
      } catch {
        return [key, String(compacted)] as const;
      }
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  return Object.fromEntries(entries);
};

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly enabled =
    process.env.POSTHOG_ENABLED !== 'false' && Boolean(process.env.POSTHOG_KEY);
  private readonly debug = process.env.POSTHOG_DEBUG === 'true';
  private readonly client = this.enabled
    ? new PostHog(process.env.POSTHOG_KEY!, {
        host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
        flushAt: 1,
        flushInterval: 0,
      })
    : null;

  async capture(
    event: string,
    context: AnalyticsContext,
    properties: AnalyticsProperties = {},
  ) {
    const distinctId = getAnalyticsDistinctId(context);

    if (!this.client || !distinctId) return;

    try {
      if (this.debug) {
        this.logger.debug(`capture:${event} distinct_id=${distinctId}`);
      }

      await this.client.capture({
        distinctId,
        event,
        properties: compactValue({
          ...properties,
          env:
            process.env.RAILWAY_ENVIRONMENT_NAME ||
            process.env.NODE_ENV ||
            'unknown',
          locale: context.locale,
          region: context.region,
          platform: context.platform,
          authenticated_user_id: context.userId,
          request_distinct_id: context.requestDistinctId,
          anonymous_id: context.anonymousId,
        }) as AnalyticsProperties,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to capture ${event}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async identify(
    context: AnalyticsContext,
    properties: AnalyticsProperties = {},
  ) {
    const distinctId = context.userId || getAnalyticsDistinctId(context);

    if (!this.client || !distinctId) return;

    try {
      if (this.debug) {
        this.logger.debug(`identify:${distinctId}`);
      }

      await this.client.identify({
        distinctId,
        properties: compactValue({
          ...properties,
          locale: context.locale,
          region: context.region,
          platform: context.platform,
        }) as AnalyticsProperties,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to identify ${distinctId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async isFeatureEnabled(
    flagKey: string,
    context: AnalyticsContext,
    personProperties: AnalyticsProperties = {},
  ) {
    const distinctId = getAnalyticsDistinctId(context);

    if (!this.client || !distinctId) return false;

    try {
      return Boolean(
        await this.client.isFeatureEnabled(flagKey, distinctId, {
          personProperties: compactFlagProperties({
            ...personProperties,
            locale: context.locale,
            region: context.region,
            platform: context.platform,
          }),
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to resolve flag ${flagKey}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return false;
    }
  }

  async getFeatureFlagPayload<T = unknown>(
    flagKey: string,
    context: AnalyticsContext,
    personProperties: AnalyticsProperties = {},
  ) {
    const distinctId = getAnalyticsDistinctId(context);

    if (!this.client || !distinctId) return undefined;

    try {
      return (await this.client.getFeatureFlagPayload(
        flagKey,
        distinctId,
        undefined,
        {
          personProperties: compactFlagProperties({
            ...personProperties,
            locale: context.locale,
            region: context.region,
            platform: context.platform,
          }),
        },
      )) as T | undefined;
    } catch (error) {
      this.logger.warn(
        `Failed to read flag payload ${flagKey}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return undefined;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
