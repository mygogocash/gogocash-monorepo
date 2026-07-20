import { Module } from '@nestjs/common';
import { InvolveModule } from 'src/involve/involve.module';
import { OptimiseModule } from 'src/optimise/optimise.module';
import { OptimiseAffiliateProvider } from 'src/optimise/optimise.provider';
import { AccesstradeModule } from 'src/accesstrade/accesstrade.module';
import { AccesstradeAffiliateProvider } from 'src/accesstrade/accesstrade.provider';
import { AFFILIATE_PROVIDERS } from './affiliate-provider.interface';
import { AffiliateProviderRegistry } from './affiliate-provider.registry';
import { InvolveAffiliateProvider } from './involve.provider';

/**
 * The affiliate provider seam.
 *
 * Imports InvolveModule (for the concrete InvolveService the adapter delegates
 * to) and nothing else — the dependency edge is one-way (AffiliateModule →
 * InvolveModule), so there is no import cycle. As more networks land, their
 * adapters get registered in the AFFILIATE_PROVIDERS factory below.
 *
 * Only the registry is exported; consumers (offer sync cron, admin commission
 * refresh, tasks controller) depend on the registry, never on a concrete
 * network adapter.
 */
@Module({
  imports: [InvolveModule, OptimiseModule, AccesstradeModule],
  providers: [
    InvolveAffiliateProvider,
    OptimiseAffiliateProvider,
    AccesstradeAffiliateProvider,
    {
      provide: AFFILIATE_PROVIDERS,
      useFactory: (
        involve: InvolveAffiliateProvider,
        optimise: OptimiseAffiliateProvider,
        accesstrade: AccesstradeAffiliateProvider,
      ) => [involve, optimise, accesstrade],
      inject: [
        InvolveAffiliateProvider,
        OptimiseAffiliateProvider,
        AccesstradeAffiliateProvider,
      ],
    },
    AffiliateProviderRegistry,
  ],
  exports: [AffiliateProviderRegistry],
})
export class AffiliateModule {}
