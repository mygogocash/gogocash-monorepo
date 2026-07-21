import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Offer } from 'src/offer/schemas/offer.schema';
import { AffiliateProviderRegistry } from 'src/affiliate/affiliate-provider.registry';
import {
  affiliateNetworkIdForSource,
  affiliateNetworkName,
  listAffiliateNetworks,
  sourceForAffiliateNetwork,
} from './affiliate-networks';
import {
  bestPercentFromPartnerRates,
  buildSuggestedAppDeeplink,
  formatPartnerRateLabels,
} from './commission-partner.util';
import { FetchBestCommissionDto } from './dto/fetch-best.dto';
import { UpdateCommissionDeeplinkDto } from './dto/update-deeplink.dto';

export type CommissionBrandRowDto = {
  id: string;
  name: string;
  merchantId: number;
  currency: string;
  partnerRates: string[];
  adminCommission: number | null;
  maxCap: number | null;
  partnerMaxCap: number | null;
  trackingLink: string;
  appDeeplink: string;
  affiliateNetworkId: string;
  affiliateNetworkName: string;
};

@Injectable()
export class CommissionManagementService {
  constructor(
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    private readonly registry: AffiliateProviderRegistry,
  ) {}

  getNetworks() {
    return { data: listAffiliateNetworks() };
  }

  async listBrands(
    networkId?: string,
  ): Promise<{ data: CommissionBrandRowDto[] }> {
    const filterNetwork = networkId?.trim() || null;
    const source = filterNetwork
      ? sourceForAffiliateNetwork(filterNetwork)
      : null;
    if (filterNetwork && !source) {
      return { data: [] };
    }

    const query: Record<string, unknown> = {
      disabled: { $ne: true },
      status: { $ne: 'rejected' },
    };
    if (source) {
      query.source = source;
    } else {
      query.source = { $in: ['involve', 'optimise'] };
    }

    const offers = await this.offerModel
      .find(query)
      .sort({ offer_name_display: 1, offer_name: 1 })
      .limit(200)
      .lean();

    const seen = new Set<number>();
    const data: CommissionBrandRowDto[] = [];
    for (const offer of offers) {
      if (seen.has(offer.merchant_id)) continue;
      seen.add(offer.merchant_id);
      data.push(this.toBrandRow(offer));
      if (data.length >= 80) break;
    }

    return { data };
  }

  async fetchBest(dto: FetchBestCommissionDto) {
    const offer = await this.loadOffer(dto.offerId);
    const expectedNw = affiliateNetworkIdForSource(offer.source ?? 'involve');
    const requestedNw = dto.affiliateNetworkId.trim();
    if (requestedNw && requestedNw !== expectedNw) {
      throw new BadRequestException(
        `This merchant is on ${affiliateNetworkName(expectedNw)}. Select that network above, then fetch again.`,
      );
    }
    const affiliateNetworkId = requestedNw || expectedNw;

    const merged = await this.mergePartnerFeed(offer, affiliateNetworkId);
    const commissions = (merged.commissions ?? []) as Record<string, string>[];
    const partnerRates = formatPartnerRateLabels(commissions);
    const fromPartner = bestPercentFromPartnerRates(commissions);
    const adminCommission =
      merged.commission_store != null ? Number(merged.commission_store) : null;
    const bestRatePercent =
      fromPartner > 0
        ? Math.round(fromPartner * 100) / 100
        : adminCommission != null && !Number.isNaN(adminCommission)
          ? Math.round(adminCommission * 100) / 100
          : 0;

    const suggestedDeeplink =
      merged.app_deeplink?.trim() ||
      buildSuggestedAppDeeplink({
        offerId: String(merged._id),
        lookupValue: merged.lookup_value ?? String(merged._id),
        currency: merged.currency ?? 'THB',
        commissions,
        commissionStore: adminCommission,
        affiliateNetworkId,
        bestRatePercent,
        deeplinkStoreId: merged.deeplink_store_id,
      });

    return {
      bestRatePercent,
      currency: merged.currency ?? 'THB',
      suggestedDeeplink,
      trackingModel: merged.commission_tracking ?? 'CPS',
      partnerRates,
      offerName: merged.offer_name_display || merged.offer_name,
      affiliateNetworkId,
      affiliateNetworkName: affiliateNetworkName(affiliateNetworkId),
      partnerMaxCap: null,
      adminMaxCap: merged.max_cap ?? null,
    };
  }

  async updateDeeplink(dto: UpdateCommissionDeeplinkDto) {
    const offer = await this.loadOffer(dto.offerId);
    await this.offerModel.updateOne(
      { _id: offer._id },
      { $set: { app_deeplink: dto.deeplink.trim() } },
    );
    return {
      success: true,
      data: { offerId: dto.offerId, deeplink: dto.deeplink.trim() },
    };
  }

  private async loadOffer(offerId: string) {
    const id = offerId.trim();
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Offer not found');
    }
    const offer = await this.offerModel.findById(new Types.ObjectId(id)).lean();
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    return offer;
  }

  private toBrandRow(offer: Record<string, any>): CommissionBrandRowDto {
    const affiliateNetworkId = affiliateNetworkIdForSource(
      offer.source ?? 'involve',
    );
    const commissions = (offer.commissions ?? []) as Record<string, string>[];
    const adminCommission =
      offer.commission_store != null ? Number(offer.commission_store) : null;
    const fromPartner = bestPercentFromPartnerRates(commissions);
    const bestRatePercent =
      fromPartner > 0
        ? fromPartner
        : adminCommission != null && !Number.isNaN(adminCommission)
          ? adminCommission
          : 0;

    return {
      id: String(offer._id),
      name: offer.offer_name_display || offer.offer_name,
      merchantId: offer.merchant_id,
      currency: offer.currency ?? 'THB',
      partnerRates: formatPartnerRateLabels(commissions),
      adminCommission,
      maxCap: offer.max_cap ?? null,
      partnerMaxCap: null,
      trackingLink: offer.tracking_link ?? '',
      appDeeplink:
        offer.app_deeplink?.trim() ||
        buildSuggestedAppDeeplink({
          offerId: String(offer._id),
          lookupValue: offer.lookup_value ?? String(offer._id),
          currency: offer.currency ?? 'THB',
          commissions,
          commissionStore: adminCommission,
          affiliateNetworkId,
          bestRatePercent,
          deeplinkStoreId: offer.deeplink_store_id,
        }),
      affiliateNetworkId,
      affiliateNetworkName: affiliateNetworkName(affiliateNetworkId),
    };
  }

  private async mergePartnerFeed(
    offer: Record<string, any>,
    affiliateNetworkId: string,
  ) {
    // Dispatch through the affiliate seam. The involve patch-building logic now
    // lives in InvolveAffiliateProvider.refreshOffer; behavior for involve is
    // unchanged (enabled + live offer -> same {commissions, tracking_link,
    // commission_tracking} patch persisted). Networks without a registered/
    // enabled provider (optimise today, disabled involve) fall through and
    // return the stored offer untouched — the existing "not connected /
    // unsupported" path.
    const source = sourceForAffiliateNetwork(affiliateNetworkId);
    // providerFor is called defensively (?.) so unit tests that construct this
    // service with a partial registry stub still exercise the fallthrough.
    const provider = source ? this.registry?.providerFor?.(source) : null;
    if (!provider || !provider.isEnabled()) {
      return offer;
    }

    const patch = await provider.refreshOffer(offer);
    if (!patch || Object.keys(patch).length === 0) {
      return offer;
    }

    await this.offerModel.updateOne({ _id: offer._id }, { $set: patch });
    return { ...offer, ...patch };
  }
}
