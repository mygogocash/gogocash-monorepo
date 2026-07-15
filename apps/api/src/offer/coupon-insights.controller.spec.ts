import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { CouponInsightsController } from './coupon-insights.controller';

describe('CouponInsightsController', () => {
  const service = {
    getInsights: jest.fn(),
    recordEngagement: jest.fn(),
    recordRedemption: jest.fn(),
  };
  const controller = new CouponInsightsController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('allows rate-limited view/copy collection but protects insights and redemption writes', () => {
    const guardsFor = (method: keyof CouponInsightsController) =>
      Reflect.getMetadata(
        GUARDS_METADATA,
        CouponInsightsController.prototype[method],
      ) ?? [];

    expect(guardsFor('recordEngagement')).toContain(RateLimitGuard);
    expect(guardsFor('getInsights')).toContain(AuthAdminGuard);
    expect(guardsFor('recordRedemption')).toContain(AuthAdminGuard);
  });

  it('delegates using the coupon id and validated DTOs', async () => {
    const engagement = {
      eventId: 'view-page-123456',
      eventType: 'view',
    } as const;
    const redemption = { referenceId: 'merchant-order-42' };
    const query = { limit: 25, page: 2 };

    await controller.recordEngagement('coupon-1', engagement);
    await controller.recordRedemption('coupon-1', redemption);
    await controller.getInsights('coupon-1', query);

    expect(service.recordEngagement).toHaveBeenCalledWith(
      'coupon-1',
      engagement,
    );
    expect(service.recordRedemption).toHaveBeenCalledWith(
      'coupon-1',
      redemption,
    );
    expect(service.getInsights).toHaveBeenCalledWith('coupon-1', query);
  });
});
