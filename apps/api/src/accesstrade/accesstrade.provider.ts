import { Injectable } from '@nestjs/common';
import {
  AffiliateNetworkProvider,
  NetworkSource,
} from 'src/affiliate/affiliate-provider.interface';
import { AccesstradeService } from './accesstrade.service';

/**
 * Adapts {@link AccesstradeService} to the {@link AffiliateNetworkProvider}
 * port. Gated by isEnabled(): with the Accesstrade credentials unset (current
 * prod state) the registry never dispatches here.
 */
@Injectable()
export class AccesstradeAffiliateProvider implements AffiliateNetworkProvider {
  readonly source: NetworkSource = 'accesstrade';

  constructor(private readonly accesstradeService: AccesstradeService) {}

  isEnabled(): boolean {
    // Accesstrade auth needs the publisher username+password (the provisioning
    // flow derives the JWT secret from them) — not a single API key. The admin
    // panel's "connected" flag is reconciled to the same check.
    return Boolean(
      process.env.ACCESSTRADE_USERNAME?.trim() &&
      process.env.ACCESSTRADE_PASSWORD?.trim(),
    );
  }

  async syncOffers(): Promise<{ upserted: number }> {
    return this.accesstradeService.syncOffers();
  }

  async mintTrackingLink(req: {
    userId: string;
    offerId: number;
    merchantId: number;
    targetUrl?: string;
  }): Promise<{ deeplink: string }> {
    const doc = await this.accesstradeService.createTrackingLink({
      userId: req.userId,
      offerId: req.offerId,
      merchantId: req.merchantId,
      targetUrl: req.targetUrl ?? '',
    });
    return { deeplink: (doc as { deeplink?: string } | null)?.deeplink ?? '' };
  }

  async refreshOffer(
    offer: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const refreshed = await this.accesstradeService.findOfferByOfferId(
      Number(offer.offer_id),
    );
    if (!refreshed) {
      return null;
    }

    const patch: Record<string, unknown> = {};
    if (Array.isArray(refreshed.commissions)) {
      patch.commissions = refreshed.commissions;
    }
    if (
      typeof refreshed.tracking_link === 'string' &&
      refreshed.tracking_link
    ) {
      patch.tracking_link = refreshed.tracking_link;
    }
    if (typeof refreshed.commission_tracking === 'string') {
      patch.commission_tracking = refreshed.commission_tracking;
    }
    return Object.keys(patch).length === 0 ? null : patch;
  }
}
