import { Request } from 'express';

export interface AnalyticsContext {
  userId?: string;
  distinctId?: string;
  requestDistinctId?: string;
  anonymousId?: string;
  locale?: string;
  region?: string;
  platform: 'api';
}

const readHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return readHeaderValue(value[0]);
  }

  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const getAnalyticsDistinctId = (context: AnalyticsContext) => {
  return context.userId || context.requestDistinctId || context.anonymousId;
};

export const extractAnalyticsContext = (
  req: Request,
  options?: { userId?: string; region?: string },
): AnalyticsContext => {
  const requestDistinctId = readHeaderValue(req.headers['x-posthog-distinct-id']);
  const anonymousId = readHeaderValue(req.headers['x-posthog-anonymous-id']);
  const locale = readHeaderValue(req.headers['x-app-locale']) || 'en';

  return {
    userId: options?.userId,
    distinctId: options?.userId || requestDistinctId || anonymousId,
    requestDistinctId,
    anonymousId,
    locale: locale === 'th' ? 'th' : 'en',
    region: options?.region,
    platform: 'api',
  };
};
