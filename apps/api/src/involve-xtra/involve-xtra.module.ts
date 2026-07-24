import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { RateLimitGuard } from '../auth/rate-limit.guard';
import { AuthAdminGuard } from '../admin/jwt-auth-admin.guard';
import { InvolveModule } from '../involve/involve.module';
import { Offer, OfferSchema } from '../offer/schemas/offer.schema';
import { CommissionsXtraScheduler } from './commissions-xtra.scheduler';
import { CommissionsXtraSyncController } from './commissions-xtra-sync.controller';
import { CommissionsXtraSyncService } from './commissions-xtra-sync.service';
import {
  InvolveCampaign,
  InvolveCampaignSchema,
} from './schemas/involve-campaign.schema';
import { InvolveShop, InvolveShopSchema } from './schemas/involve-shop.schema';

// #586 / #504 — Involve Commission Xtra (shops + vouchers) subsystem.
// PR1 added the schemas; PR2 adds the sync service, cron scheduler, and the
// admin break-glass manual trigger. /explore serving + app surfacing follow.
// AnalyticsService resolves via the @Global AnalyticsModule (app.module).
@Module({
  imports: [
    // AuthAdminGuard on the manual-trigger controller injects JwtService.
    JwtModule.register({ secret: process.env.JWT_ADMIN_SECRET }),
    // InvolveService (exported by InvolveModule) supplies the shared Involve
    // Bearer-token cache used for CX auth (REQ-CFG-1).
    InvolveModule,
    MongooseModule.forFeature([
      { name: InvolveShop.name, schema: InvolveShopSchema },
      { name: InvolveCampaign.name, schema: InvolveCampaignSchema },
      // Read-only, for REQ-DM-3 offerId resolution.
      { name: Offer.name, schema: OfferSchema },
    ]),
  ],
  controllers: [CommissionsXtraSyncController],
  providers: [
    CommissionsXtraSyncService,
    CommissionsXtraScheduler,
    AuthAdminGuard,
    RateLimitGuard,
  ],
  exports: [MongooseModule, CommissionsXtraSyncService],
})
export class InvolveXtraModule {}
