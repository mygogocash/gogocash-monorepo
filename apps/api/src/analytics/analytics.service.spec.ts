import { AnalyticsService } from './analytics.service';
import { AnalyticsContext } from './analytics-context';
import { PostHog } from 'posthog-node';

const mockCapture = jest.fn();
const mockShutdown = jest.fn();

jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    shutdown: mockShutdown,
  })),
}));

const baseContext: AnalyticsContext = {
  userId: 'user-1',
  locale: 'th',
  platform: 'api',
};

describe('AnalyticsService', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    process.env.POSTHOG_KEY = 'test-key';
    delete process.env.POSTHOG_ENABLED;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('capture > given no POSTHOG_KEY', () => {
    it('then it no-ops without constructing a client', async () => {
      delete process.env.POSTHOG_KEY;
      const service = new AnalyticsService();

      await service.capture('some_event', baseContext);

      expect(PostHog).not.toHaveBeenCalled();
      expect(mockCapture).not.toHaveBeenCalled();
    });
  });

  describe('capture > auto-appended properties', () => {
    it('given RAILWAY_ENVIRONMENT_NAME > then env, locale and platform are appended', async () => {
      process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
      const service = new AnalyticsService();

      await service.capture('some_event', baseContext, { foo: 'bar' });

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-1',
        event: 'some_event',
        properties: expect.objectContaining({
          foo: 'bar',
          env: 'production',
          locale: 'th',
          platform: 'api',
          authenticated_user_id: 'user-1',
        }),
      });
    });

    it('given no RAILWAY_ENVIRONMENT_NAME > then env falls back to NODE_ENV', async () => {
      delete process.env.RAILWAY_ENVIRONMENT_NAME;
      process.env.NODE_ENV = 'test';
      const service = new AnalyticsService();

      await service.capture('some_event', baseContext);

      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({ env: 'test' }),
        }),
      );
    });

    it('given neither RAILWAY_ENVIRONMENT_NAME nor NODE_ENV > then env is "unknown"', async () => {
      delete process.env.RAILWAY_ENVIRONMENT_NAME;
      delete process.env.NODE_ENV;
      const service = new AnalyticsService();

      await service.capture('some_event', baseContext);

      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({ env: 'unknown' }),
        }),
      );
    });
  });

  describe('capture > $set passthrough', () => {
    it('given $set person properties > then they reach the client unchanged', async () => {
      const service = new AnalyticsService();

      await service.capture('some_event', baseContext, {
        $set: { locale: 'th', provider: 'google', platform: 'api' },
      });

      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            $set: { locale: 'th', provider: 'google', platform: 'api' },
          }),
        }),
      );
    });
  });

  describe('capture > given no resolvable distinct id', () => {
    it('then it does not send the event', async () => {
      const service = new AnalyticsService();

      await service.capture('some_event', { platform: 'api' });

      expect(mockCapture).not.toHaveBeenCalled();
    });
  });
});
