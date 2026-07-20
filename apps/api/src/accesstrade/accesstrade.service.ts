import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import axios from 'axios';
import { Model, Types } from 'mongoose';
import { Offer } from 'src/offer/schemas/offer.schema';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import {
  buildAccesstradeProvisioningAuth,
  buildAccesstradePublisherJwt,
} from './accesstrade.auth';
import { mapAccesstradeCampaignToOffer } from './accesstrade.mappers';

const ACCESSTRADE_TIMEOUT_MS = 10_000;
const ACCESSTRADE_PAGE_LIMIT = 20;
const GENERAL_DESTINATION_SENTINEL = ' accesstrade-general-destination';

type AccesstradeItem = Record<string, unknown>;
type Provisioned = { userUid: string; secretKey: string };

/**
 * Accesstrade Global publisher network service: two-stage JWT auth + per-site
 * campaign discovery + custom-creative deeplink minting + offer upsert. Mirrors
 * OptimiseService/InvolveService behind the affiliate seam. Conversion
 * ingestion (money path) is deliberately NOT here.
 */
@Injectable()
export class AccesstradeService {
  private readonly logger = new Logger(AccesstradeService.name);
  private provisioned: Provisioned | null = null;

  constructor(
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    @InjectModel(Deeplink.name) private readonly deeplinkModel: Model<Deeplink>,
  ) {}

  private base(): string {
    return (
      process.env.ACCESSTRADE_API_BASE?.replace(/\/$/, '') ||
      'https://gurkha.accesstrade.in.th'
    );
  }
  private siteId(): string {
    return process.env.ACCESSTRADE_SITE_ID ?? '';
  }

  /** Stage 1: exchange username+password for { userUid, secretKey }. Cached. */
  private async provision(): Promise<Provisioned> {
    if (this.provisioned) return this.provisioned;
    const username = process.env.ACCESSTRADE_USERNAME ?? '';
    const password = process.env.ACCESSTRADE_PASSWORD ?? '';
    try {
      const res = await axios.get<{ userUid?: string; secretKey?: string }>(
        `${this.base()}/publishers/auth/${encodeURIComponent(username)}`,
        {
          headers: {
            Authorization: buildAccesstradeProvisioningAuth(username, password),
          },
          timeout: ACCESSTRADE_TIMEOUT_MS,
        },
      );
      const userUid = res.data?.userUid;
      const secretKey = res.data?.secretKey;
      if (!userUid || !secretKey) {
        throw new BadGatewayException({
          code: 'ACCESSTRADE_PROVISION_INVALID',
        });
      }
      this.provisioned = { userUid, secretKey };
      return this.provisioned;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const status =
        (error as { response?: { status?: number } })?.response?.status ?? 0;
      // Leak-safe: never echo the provisioning header (derived from the password).
      throw new BadGatewayException({
        code: 'ACCESSTRADE_PROVISION_FAILED',
        upstreamStatusCode: status,
      });
    }
  }

  /** Stage 2: a fresh HS256 publisher JWT bearer for a call. */
  private async authHeaders(): Promise<Record<string, string>> {
    const { userUid, secretKey } = await this.provision();
    const iat = Math.floor(Date.now() / 1000);
    return {
      Authorization: `Bearer ${buildAccesstradePublisherJwt(userUid, secretKey, iat)}`,
      'X-Accesstrade-User-Type': 'publisher',
    };
  }

  private async httpGet<T = unknown>(
    path: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    try {
      const res = await axios.get<T>(`${this.base()}${path}`, {
        params,
        headers: await this.authHeaders(),
        timeout: ACCESSTRADE_TIMEOUT_MS,
      });
      return res.data;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const status =
        (error as { response?: { status?: number } })?.response?.status ?? 0;
      throw new BadGatewayException({
        code: 'ACCESSTRADE_UPSTREAM_ERROR',
        upstreamStatusCode: status,
      });
    }
  }

  /** Page GET /v1/publishers/me/sites/{siteId}/campaigns/unaffiliated. */
  async fetchAllCampaigns(): Promise<AccesstradeItem[]> {
    const all: AccesstradeItem[] = [];
    let page = 1;
    for (;;) {
      const data = await this.httpGet<{ content?: AccesstradeItem[] }>(
        `/v1/publishers/me/sites/${this.siteId()}/campaigns/unaffiliated`,
        { limit: ACCESSTRADE_PAGE_LIMIT, page },
      );
      const content = Array.isArray(data?.content) ? data.content : [];
      all.push(...content);
      if (content.length < ACCESSTRADE_PAGE_LIMIT) break;
      page += 1;
    }
    return all;
  }

  /**
   * Sync discovered Accesstrade campaigns into the Offer store.
   *
   * The filter matches `source: 'accesstrade'` EXACTLY. Involve's sync widens to
   * `$in: ['involve', null]` because a source-less legacy document *is* an
   * Involve offer (offer.schema.ts defaults `source` to 'involve'); copying that
   * arm here would let an `offer_id` collision overwrite an Involve offer's
   * tracking link with an Accesstrade one.
   *
   * `status` is admin curation, not upstream state, so it rides `$setOnInsert`:
   * newly-seen campaigns seed to pending_review and a re-sync never reverts an
   * approve/reject. `type`/`disabled` still track upstream state each pass.
   *
   * DELIBERATELY NO STALE-SWEEP. This reads `/campaigns/unaffiliated`, a partial
   * view of the catalogue: a campaign leaves that list precisely when we
   * affiliate it, which is the goal state (Accesstrade requires affiliation
   * before a campaign can earn). Sweeping "everything absent from the pull"
   * would disable an offer the moment it became earnable. A correct sweep needs
   * an authoritative full-catalogue enumeration; that endpoint is unconfirmed
   * against a live account, so this sync only ever adds and refreshes.
   */
  async syncOffers(): Promise<{ upserted: number }> {
    const campaigns = await this.fetchAllCampaigns();
    const ids: number[] = [];
    for (const campaign of campaigns) {
      const { status, ...mapped } = mapAccesstradeCampaignToOffer(campaign);
      const offerId = mapped.offer_id as number;
      if (!Number.isFinite(offerId) || offerId === 0) continue;
      ids.push(offerId);
      await this.offerModel.updateOne(
        { source: 'accesstrade', offer_id: offerId },
        {
          $set: {
            ...mapped,
            source: 'accesstrade',
            type: 'new',
            disabled: false,
          },
          $setOnInsert: { status },
        },
        { upsert: true },
      );
    }
    return { upserted: ids.length };
  }

  async findOfferByOfferId(
    offerId: number,
  ): Promise<Record<string, unknown> | null> {
    if (!Number.isFinite(offerId)) return null;
    try {
      const data = await this.httpGet<AccesstradeItem>(
        `/v1/campaigns/${offerId}`,
        { siteId: this.siteId() },
      );
      if (!data || typeof data !== 'object') return null;
      return mapAccesstradeCampaignToOffer(data);
    } catch {
      return null;
    }
  }

  private destinationHash(destination: string): string {
    return createHash('sha256')
      .update(destination || GENERAL_DESTINATION_SENTINEL, 'utf8')
      .digest('hex');
  }

  /**
   * Mint (or reuse) a user-scoped tracking link. Accesstrade attributes the
   * GoGoCash userId via a custom creative's `subIds` (label `uid`), which yields
   * an `affiliateLink` (rk-keyed redirect). Reuse-first on the Deeplink identity
   * to avoid re-creating creatives.
   */
  async createTrackingLink(req: {
    userId: string;
    offerId: number;
    merchantId: number;
    targetUrl: string;
  }): Promise<{ deeplink: string } | null> {
    const identity = {
      source: 'accesstrade',
      user_id: new Types.ObjectId(req.userId),
      offer_id: req.offerId,
      merchant_id: req.merchantId,
      destination_hash: this.destinationHash(req.targetUrl),
    };

    const existing = await this.deeplinkModel.findOne(identity).lean().exec();
    if (existing?.deeplink) {
      return { deeplink: existing.deeplink };
    }

    const affiliateLink = await this.createCustomCreative(req);
    if (!affiliateLink) {
      throw new BadGatewayException({ code: 'ACCESSTRADE_EMPTY_DEEPLINK' });
    }

    const created = await this.deeplinkModel.create({
      ...identity,
      deeplink: affiliateLink,
      destination_url: req.targetUrl || undefined,
    });
    return { deeplink: created.deeplink };
  }

  /** POST a custom creative carrying the userId in subIds; returns affiliateLink. */
  private async createCustomCreative(req: {
    userId: string;
    offerId: number;
    targetUrl: string;
  }): Promise<string> {
    try {
      const res = await axios.post<{ affiliateLink?: string }>(
        `${this.base()}/v1/publishers/me/sites/${this.siteId()}/campaigns/${req.offerId}/creatives/custom`,
        {
          landingUrl: req.targetUrl,
          imageUrl: '',
          anchorText: '',
          name: `gogocash-${req.userId}-${req.offerId}`,
          subIds: [{ label: 'uid', value: req.userId, name: 'uid' }],
        },
        { headers: await this.authHeaders(), timeout: ACCESSTRADE_TIMEOUT_MS },
      );
      return typeof res.data?.affiliateLink === 'string'
        ? res.data.affiliateLink
        : '';
    } catch (error) {
      const status =
        (error as { response?: { status?: number } })?.response?.status ?? 0;
      throw new BadGatewayException({
        code: 'ACCESSTRADE_CREATIVE_FAILED',
        upstreamStatusCode: status,
      });
    }
  }
}
