import { Inject, Injectable } from '@nestjs/common';
import {
  AFFILIATE_PROVIDERS,
  AffiliateNetworkProvider,
} from './affiliate-provider.interface';

/**
 * Resolves an {@link AffiliateNetworkProvider} by its network source and lists
 * the currently-enabled providers. This is the single lookup callers use to
 * dispatch across networks without importing concrete network services.
 */
@Injectable()
export class AffiliateProviderRegistry {
  constructor(
    @Inject(AFFILIATE_PROVIDERS)
    private readonly providers: AffiliateNetworkProvider[],
  ) {}

  /**
   * Returns the registered provider for `source`, or `null` for an unknown /
   * unmanaged source (e.g. `'manual'`). Resolution is independent of enabled
   * state — a registered-but-disabled provider is still returned; callers check
   * {@link AffiliateNetworkProvider.isEnabled} themselves.
   */
  providerFor(source: string): AffiliateNetworkProvider | null {
    return this.providers.find((p) => p.source === source) ?? null;
  }

  /** All registered providers whose network is enabled in this environment. */
  enabledProviders(): AffiliateNetworkProvider[] {
    return this.providers.filter((p) => p.isEnabled());
  }
}
