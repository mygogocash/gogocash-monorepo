import { Logger } from '@nestjs/common';
import { AffiliateProviderRegistry } from './affiliate-provider.registry';

/**
 * Runs `syncOffers()` for every enabled affiliate provider, sequentially and
 * ERROR-ISOLATED: a single provider throwing is caught, logged, and swallowed
 * so the remaining providers still sync. Shared by the offer sync cron and the
 * admin break-glass `update-offers` route so both dispatch identically.
 */
export async function syncEnabledAffiliateProviders(
  registry: AffiliateProviderRegistry,
  logger: Logger,
): Promise<void> {
  for (const provider of registry.enabledProviders()) {
    try {
      const { upserted } = await provider.syncOffers();
      logger.log(`affiliate sync: ${provider.source} upserted ${upserted}`);
    } catch (error) {
      // Isolation: never let one network's failure skip the others.
      logger.error(
        `affiliate sync: ${provider.source} failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
