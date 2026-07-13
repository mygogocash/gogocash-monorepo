import { Injectable } from '@nestjs/common';
import { InvolveService } from 'src/involve/involve.service';
import {
  AffiliateNetworkProvider,
  NetworkSource,
} from './affiliate-provider.interface';

/**
 * Adapts the existing {@link InvolveService} to the {@link AffiliateNetworkProvider}
 * port. This adapter is the ONLY place that knows the Involve service's method
 * shape — `involve.service.ts` itself is untouched by the seam.
 */
@Injectable()
export class InvolveAffiliateProvider implements AffiliateNetworkProvider {
  readonly source: NetworkSource = 'involve';

  constructor(private readonly involveService: InvolveService) {}

  isEnabled(): boolean {
    return Boolean(process.env.INVOLVE_SECRET);
  }

  async syncOffers(): Promise<{ upserted: number }> {
    const result = await this.involveService.findAll();
    return { upserted: Array.isArray(result) ? result.length : 0 };
  }

  async mintTrackingLink(req: {
    userId: string;
    offerId: number;
    merchantId: number;
    targetUrl?: string;
  }): Promise<{ deeplink: string }> {
    const doc = await this.involveService.createAffiliate(
      {
        offer_id: req.offerId,
        merchant_id: req.merchantId,
        deeplink: req.targetUrl ?? '',
      },
      req.userId,
    );
    return { deeplink: (doc as { deeplink?: string } | null)?.deeplink ?? '' };
  }

  /**
   * Involve-Asia offer refresh. This is the patch-building logic moved verbatim
   * out of commission-management's mergePartnerFeed: live-lookup the offer, then
   * assemble the persistable patch. Returns `null` when the lookup misses or no
   * field is patchable, so the caller leaves the stored offer untouched.
   */
  async refreshOffer(
    offer: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const refreshed = await this.involveService.findOfferByOfferId(
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
