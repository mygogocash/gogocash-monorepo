import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import axios from 'axios';
import { Model, Types } from 'mongoose';
import { Offer } from 'src/offer/schemas/offer.schema';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import {
  appendOptimiseUid,
  mapOptimiseCampaignToOffer,
} from './optimise.mappers';

const OPTIMISE_TIMEOUT_MS = 10_000;
const OPTIMISE_PAGE_LIMIT = 50;
/** Optimise's Kong gateway hard-caps every account at 5 requests/minute. */
const OPTIMISE_MIN_CALL_INTERVAL_MS = 12_000;
const OPTIMISE_DEFAULT_BASE = 'https://public.api.optimisemedia.com/v1';
/** Deeplink identity hash sentinel for a general (no-destination) mint. */
const GENERAL_DESTINATION_SENTINEL = 'optimise-general-destination';

type OptimiseCampaign = Record<string, unknown>;

/**
 * Optimise Media network service: HTTP (throttled, apikey-authed) + Mongo
 * (offer upsert, deeplink mint/persist). Mirrors {@link InvolveService}'s
 * responsibilities behind the affiliate seam. Pure campaign->Offer translation
 * lives in optimise.mappers.ts; this file owns I/O.
 *
 * NOTE: conversion ingestion (money path) is deliberately NOT here — it belongs
 * in the per-network cron (withdraw/cronjob) and is gated/validated separately.
 */
@Injectable()
export class OptimiseService {
  private readonly logger = new Logger(OptimiseService.name);
  private lastCallAt = 0;

  constructor(
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    @InjectModel(Deeplink.name) private readonly deeplinkModel: Model<Deeplink>,
  ) {}

  private base(): string {
    return (
      process.env.OPTIMISE_API_BASE?.replace(/\/$/, '') || OPTIMISE_DEFAULT_BASE
    );
  }
  private contactId(): string {
    return process.env.OPTIMISE_CONTACT_ID || '2442123';
  }
  private agencyId(): string {
    return process.env.OPTIMISE_AGENCY_ID ?? '';
  }

  /** Space outbound calls to respect the 5 req/min gateway ceiling. */
  private async throttle(): Promise<void> {
    const wait = OPTIMISE_MIN_CALL_INTERVAL_MS - (Date.now() - this.lastCallAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    this.lastCallAt = Date.now();
  }

  /**
   * Authenticated GET. The key rides in the lowercase `apikey` header (verified
   * against the live Kong gateway — `x-api-key` / `Authorization` are rejected).
   * Never rethrow the raw axios error — its config echoes the apikey header.
   */
  private async httpGet<T = unknown>(
    path: string,
    params: Record<string, unknown>,
  ): Promise<{ data: T; headers: Record<string, unknown> }> {
    await this.throttle();
    try {
      const res = await axios.get<T>(`${this.base()}${path}`, {
        params,
        headers: { apikey: process.env.OPTIMISE_API_KEY ?? '' },
        timeout: OPTIMISE_TIMEOUT_MS,
      });
      return {
        data: res.data,
        headers: res.headers as Record<string, unknown>,
      };
    } catch (error) {
      const status =
        (error as { response?: { status?: number } })?.response?.status ?? 0;
      // Secret-leak-safe: build a fresh error carrying only the upstream code.
      throw new BadGatewayException({
        code: 'OPTIMISE_UPSTREAM_ERROR',
        upstreamStatusCode: status,
      });
    }
  }

  /** Page through GET /campaigns/ (publisher scope), respecting X-Total-Count. */
  async fetchAllCampaigns(): Promise<OptimiseCampaign[]> {
    const all: OptimiseCampaign[] = [];
    let offset = 0;
    for (;;) {
      const { data, headers } = await this.httpGet<OptimiseCampaign[]>(
        '/campaigns/',
        {
          contactId: this.contactId(),
          agencyId: this.agencyId(),
          limit: OPTIMISE_PAGE_LIMIT,
          offset,
        },
      );
      const page = Array.isArray(data) ? data : [];
      all.push(...page);
      const total = Number(
        headers['x-total-count'] ?? headers['X-Total-Count'],
      );
      offset += OPTIMISE_PAGE_LIMIT;
      if (page.length < OPTIMISE_PAGE_LIMIT) break;
      if (Number.isFinite(total) && offset >= total) break;
    }
    return all;
  }

  /**
   * Sync the Optimise catalogue into the Offer store. Upserts each campaign
   * scoped to `source:'optimise'` (compound-unique `{source, offer_id}`), then
   * disables offers no longer returned — guarded by `ids.length > 0` so a
   * transient empty pull never disables the whole catalogue.
   *
   * Both filters match `source: 'optimise'` EXACTLY. Involve's sync widens to
   * `$in: ['involve', null]` because a source-less legacy document *is* an
   * Involve offer (offer.schema.ts defaults `source` to 'involve'); copying that
   * arm here would let this sweep disable the entire legacy Involve catalogue on
   * the first run after the key is provisioned, and let an `offer_id` collision
   * overwrite an Involve offer's tracking link with an Optimise one.
   *
   * `status` is admin curation, not upstream state, so it rides `$setOnInsert`:
   * newly-seen campaigns seed to pending_review, and a re-sync never reverts an
   * approve/reject. `type`/`disabled` DO track upstream availability every pass,
   * matching Involve.
   */
  async syncOffers(): Promise<{ upserted: number }> {
    const campaigns = await this.fetchAllCampaigns();
    const ids: number[] = [];
    for (const campaign of campaigns) {
      const { status, ...mapped } = mapOptimiseCampaignToOffer(campaign);
      const offerId = mapped.offer_id as number;
      if (!Number.isFinite(offerId) || offerId === 0) continue;
      ids.push(offerId);
      await this.offerModel.updateOne(
        { source: 'optimise', offer_id: offerId },
        {
          $set: { ...mapped, source: 'optimise', type: 'new', disabled: false },
          $setOnInsert: { status },
        },
        { upsert: true },
      );
    }
    if (ids.length > 0) {
      await this.offerModel.updateMany(
        { source: 'optimise', offer_id: { $nin: ids } },
        { $set: { type: 'old', disabled: true } },
      );
    }
    return { upserted: ids.length };
  }

  /** Live single-campaign lookup for the admin commission refresh. */
  async findOfferByOfferId(
    offerId: number,
  ): Promise<Record<string, unknown> | null> {
    if (!Number.isFinite(offerId)) return null;
    try {
      const { data } = await this.httpGet<OptimiseCampaign>(
        `/campaigns/${offerId}`,
        { contactId: this.contactId(), agencyId: this.agencyId() },
      );
      if (!data || typeof data !== 'object') return null;
      return mapOptimiseCampaignToOffer(data);
    } catch {
      // Live-lookup miss is non-fatal — leave the stored offer untouched.
      return null;
    }
  }

  private destinationHash(destination: string): string {
    return createHash('sha256')
      .update(destination || GENERAL_DESTINATION_SENTINEL, 'utf8')
      .digest('hex');
  }

  /**
   * Mint (or reuse) a user-scoped Optimise tracking link. Reuse-first on the
   * shared Deeplink identity to avoid burning the 5rpm budget. The GoGoCash
   * userId is appended as `uid=` so it surfaces in the conversion's
   * `uniqueIds.uid` (attribution key is `assumed` pending Optimise confirmation).
   */
  async createTrackingLink(req: {
    userId: string;
    offerId: number;
    merchantId: number;
    targetUrl: string;
  }): Promise<{ deeplink: string } | null> {
    const userObjectId = new Types.ObjectId(req.userId);
    const destinationHash = this.destinationHash(req.targetUrl);
    const identity = {
      source: 'optimise',
      user_id: userObjectId,
      offer_id: req.offerId,
      merchant_id: req.merchantId,
      destination_hash: destinationHash,
    };

    const existing = await this.deeplinkModel.findOne(identity).lean().exec();
    if (existing?.deeplink) {
      return { deeplink: existing.deeplink };
    }

    const deeplinkUrl = await this.generateDeeplink(req.offerId, req.targetUrl);
    const tracked = appendOptimiseUid(deeplinkUrl, req.userId);
    if (!tracked) {
      throw new BadGatewayException({
        code: 'OPTIMISE_EMPTY_DEEPLINK',
        upstreamStatusCode: 502,
      });
    }

    const created = await this.deeplinkModel.create({
      ...identity,
      deeplink: tracked,
      destination_url: req.targetUrl || undefined,
    });
    return { deeplink: created.deeplink };
  }

  /** GET /campaigns/deeplink — pass pid (campaign) or url; returns deeplinkUrl. */
  private async generateDeeplink(
    offerId: number,
    targetUrl: string,
  ): Promise<string> {
    const params: Record<string, unknown> = {
      agencyId: this.agencyId(),
      aid: this.contactId(),
    };
    if (targetUrl) params.url = targetUrl;
    else params.pid = offerId;
    const { data } = await this.httpGet<{ deeplinkUrl?: string }>(
      '/campaigns/deeplink',
      params,
    );
    return typeof data?.deeplinkUrl === 'string' ? data.deeplinkUrl : '';
  }
}
