import { MODULE_METADATA } from '@nestjs/common/constants';

import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RolesGuard } from 'src/admin/roles.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { OfferModule } from './offer.module';

describe('OfferModule guard providers', () => {
  it('registers every guard used by coupon insight routes', () => {
    const providers =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, OfferModule) ?? [];

    expect(providers).toEqual(
      expect.arrayContaining([AuthAdminGuard, RolesGuard, RateLimitGuard]),
    );
  });
});
