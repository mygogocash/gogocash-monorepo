import { Module } from '@nestjs/common';
import { InvolveModule } from 'src/involve/involve.module';
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
  imports: [InvolveModule],
  providers: [
    InvolveAffiliateProvider,
    {
      provide: AFFILIATE_PROVIDERS,
      useFactory: (involve: InvolveAffiliateProvider) => [involve],
      inject: [InvolveAffiliateProvider],
    },
    AffiliateProviderRegistry,
  ],
  exports: [AffiliateProviderRegistry],
})
export class AffiliateModule {}
