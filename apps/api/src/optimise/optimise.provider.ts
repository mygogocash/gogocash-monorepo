import { Injectable } from '@nestjs/common';
import {
  AffiliateNetworkProvider,
  NetworkSource,
} from 'src/affiliate/affiliate-provider.interface';
import { OptimiseService } from './optimise.service';

/**
 * Adapts {@link OptimiseService} to the {@link AffiliateNetworkProvider} port,
 * mirroring {@link InvolveAffiliateProvider}. The provider owns the port shape
 * (patch-building, deeplink normalization); the service owns HTTP + Mongo.
 *
 * `isEnabled()` gates dispatch: with `OPTIMISE_API_KEY` unset (the current
 * production state) the registry never routes a sync/mint/refresh here, so
 * registering this provider has no runtime effect until the key is provisioned.
 */
@Injectable()
export class OptimiseAffiliateProvider implements AffiliateNetworkProvider {
  readonly source: NetworkSource = 'optimise';

  constructor(private readonly optimiseService: OptimiseService) {}

  isEnabled(): boolean {
    // Match the admin panel's connected check
    // (admin/commission-management/affiliate-networks.ts) so the seam and the
    // panel can never disagree about whether Optimise is wired up.
    return Boolean(process.env.OPTIMISE_API_KEY?.trim());
  }

  async syncOffers(): Promise<{ upserted: number }> {
    return this.optimiseService.syncOffers();
  }

  async mintTrackingLink(req: {
    userId: string;
    offerId: number;
    merchantId: number;
    targetUrl?: string;
  }): Promise<{ deeplink: string }> {
    const doc = await this.optimiseService.createTrackingLink({
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
    const refreshed = await this.optimiseService.findOfferByOfferId(
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
