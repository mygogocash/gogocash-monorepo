import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { InvolveService } from 'src/involve/involve.service';
import { ActivationRequestDto } from './dto/activation-request.dto';
import { DetectionRequestDto } from './dto/detection-request.dto';
import { GogosenseSettingsDto } from './dto/gogosense-settings.dto';
import {
  GogosenseActivationEvent,
  GogosenseActivationEventDocument,
} from './schemas/gogosense-activation-event.schema';
import {
  GogosenseDetectionEvent,
  GogosenseDetectionEventDocument,
} from './schemas/gogosense-detection-event.schema';
import {
  GogosenseMerchant,
  GogosenseMerchantDocument,
} from './schemas/gogosense-merchant.schema';
import {
  GogosenseScreenshotJob,
  GogosenseScreenshotJobDocument,
} from './schemas/gogosense-screenshot-job.schema';
import {
  GogosenseUserSettings,
  GogosenseUserSettingsDocument,
} from './schemas/gogosense-user-settings.schema';

type LeanMerchant = {
  merchant_id: string;
  brand_id?: string;
  brand_slug: string;
  merchant_name: string;
  android_packages?: string[];
  domains?: string[];
  offer_id: number;
  network_merchant_id: number;
  cashback_rate?: string;
  affiliate_network?: string;
  supported_platforms?: string[];
  enabled?: boolean;
  confidence_threshold?: number;
};

export type DetectionResponse = {
  detectionEventId?: string;
  matched: boolean;
  merchantId?: string;
  merchantName?: string;
  brandSlug?: string;
  offerId?: number;
  networkMerchantId?: number;
  cashbackRate?: string;
  confidenceScore?: number;
  recommendedAction: 'activate' | 'ignore' | 'manual_review';
};

export type ActivationResponse = {
  activationEventId: string;
  deeplink: string;
  expiresAt?: string;
};

const SCREENSHOT_JOB_TTL_MS = 24 * 60 * 60 * 1000;

const normalizePackageName = (packageName?: string) =>
  packageName?.trim().toLowerCase() || undefined;

const normalizeDomain = (urlOrDomain?: string) => {
  if (!urlOrDomain) return undefined;

  try {
    const withProtocol = /^https?:\/\//i.test(urlOrDomain)
      ? urlOrDomain
      : `https://${urlOrDomain}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return (
      urlOrDomain
        .trim()
        .replace(/^www\./i, '')
        .toLowerCase() || undefined
    );
  }
};

const domainMatches = (candidateDomain: string, merchantDomain: string) => {
  const normalizedMerchantDomain = normalizeDomain(merchantDomain);
  if (!normalizedMerchantDomain) return false;

  return (
    candidateDomain === normalizedMerchantDomain ||
    candidateDomain.endsWith(`.${normalizedMerchantDomain}`)
  );
};

const getDocumentId = (doc: unknown) => {
  const id = (doc as { _id?: { toString?: () => string } | string })?._id;
  return typeof id === 'string' ? id : id?.toString?.();
};

@Injectable()
export class GogosenseService {
  constructor(
    @InjectModel(GogosenseMerchant.name)
    private readonly merchantModel: Model<GogosenseMerchantDocument>,
    @InjectModel(GogosenseDetectionEvent.name)
    private readonly detectionEventModel: Model<GogosenseDetectionEventDocument>,
    @InjectModel(GogosenseActivationEvent.name)
    private readonly activationEventModel: Model<GogosenseActivationEventDocument>,
    @InjectModel(GogosenseScreenshotJob.name)
    private readonly screenshotJobModel: Model<GogosenseScreenshotJobDocument>,
    @InjectModel(GogosenseUserSettings.name)
    private readonly userSettingsModel: Model<GogosenseUserSettingsDocument>,
    private readonly involveService: InvolveService,
    private readonly analytics: AnalyticsService,
  ) {}

  async listMerchants() {
    return this.merchantModel.find({ enabled: true }).lean();
  }

  async matchMerchant(
    request: DetectionRequestDto,
  ): Promise<DetectionResponse> {
    const merchants = (await this.listMerchants()) as LeanMerchant[];
    const packageName = normalizePackageName(request.packageName);
    const domain = normalizeDomain(request.url);
    const text = request.notificationText?.trim().toLowerCase();

    for (const merchant of merchants) {
      const packageMatch =
        packageName &&
        (merchant.android_packages || []).some(
          (candidate) => normalizePackageName(candidate) === packageName,
        );
      const domainMatch =
        domain &&
        (merchant.domains || []).some((candidate) =>
          domainMatches(domain, candidate),
        );
      const textMatch =
        text &&
        [
          merchant.merchant_name,
          merchant.brand_slug,
          ...(merchant.domains || []),
        ]
          .filter(Boolean)
          .some((candidate) => text.includes(String(candidate).toLowerCase()));

      const confidenceScore =
        packageMatch || domainMatch ? 1 : textMatch ? 0.8 : 0;
      const threshold = merchant.confidence_threshold ?? 0.75;

      if (confidenceScore >= threshold) {
        return {
          matched: true,
          merchantId: merchant.merchant_id,
          merchantName: merchant.merchant_name,
          brandSlug: merchant.brand_slug,
          offerId: merchant.offer_id,
          networkMerchantId: merchant.network_merchant_id,
          cashbackRate: merchant.cashback_rate,
          confidenceScore,
          recommendedAction: 'activate',
        };
      }
    }

    return {
      matched: false,
      recommendedAction: 'ignore',
    };
  }

  async detect(
    userId: string,
    request: DetectionRequestDto,
  ): Promise<DetectionResponse> {
    const match = await this.matchMerchant(request);
    if (request.screenshotJobId) {
      const screenshotJob = await this.getScreenshotJob(
        userId,
        request.screenshotJobId,
      );
      if (!screenshotJob) {
        throw new BadRequestException(
          'Screenshot recovery job is invalid or expired',
        );
      }
    }
    const event = await this.detectionEventModel.create({
      user_id: userId,
      detection_method: request.method,
      merchant_id: match.merchantId,
      merchant_name: match.merchantName,
      brand_slug: match.brandSlug,
      offer_id: match.offerId,
      network_merchant_id: match.networkMerchantId,
      cashback_rate: match.cashbackRate,
      confidence_score: match.confidenceScore,
      matched: match.matched,
      package_name: request.packageName,
      url: request.url,
      notification_text: request.notificationText,
      screenshot_job_id: request.screenshotJobId,
      observed_at: new Date(request.observedAt),
      platform: request.platform,
      app_version: request.appVersion,
      recommended_action: match.recommendedAction,
    });

    if (match.matched) {
      await this.analytics.capture(
        'gogosense_merchant_detected',
        { platform: 'api', userId },
        {
          merchant_id: match.merchantId,
          method: request.method,
          confidence_score: match.confidenceScore,
        },
      );
    }

    return {
      ...match,
      detectionEventId: getDocumentId(event),
    };
  }

  async activate(
    userId: string,
    request: ActivationRequestDto,
  ): Promise<ActivationResponse> {
    await this.assertDetectionEventMatchesActivation(userId, request);

    const deeplinkDoc = await this.involveService.createAffiliate(
      {
        offer_id: request.offerId,
        merchant_id: request.networkMerchantId,
        deeplink: '',
      },
      userId,
    );
    const deeplink =
      (deeplinkDoc as { deeplink?: string; tracking_link?: string })
        ?.deeplink ||
      (deeplinkDoc as { tracking_link?: string })?.tracking_link ||
      '';

    const activation = await this.activationEventModel.create({
      user_id: userId,
      detection_event_id: request.detectionEventId,
      merchant_id: request.merchantId,
      offer_id: request.offerId,
      network_merchant_id: request.networkMerchantId,
      source: request.source,
      deeplink,
    });

    await this.analytics.capture(
      'gogosense_activation_completed',
      { platform: 'api', userId },
      {
        merchant_id: request.merchantId,
        offer_id: request.offerId,
        network_merchant_id: request.networkMerchantId,
        source: request.source,
      },
    );

    return {
      activationEventId: getDocumentId(activation) || '',
      deeplink,
    };
  }

  private async assertDetectionEventMatchesActivation(
    userId: string,
    request: ActivationRequestDto,
  ) {
    if (!request.detectionEventId) {
      if (request.source === 'gogosense') {
        throw new BadRequestException(
          'GoGoSense activation requires a detection event',
        );
      }

      return;
    }

    const detectionEvent = await this.detectionEventModel
      .findOne({
        _id: request.detectionEventId,
        user_id: userId,
        merchant_id: request.merchantId,
        network_merchant_id: request.networkMerchantId,
        matched: true,
      })
      .lean();

    if (!detectionEvent) {
      throw new BadRequestException(
        'Invalid GoGoSense detection event for activation',
      );
    }
  }

  async getTimeline(userId: string) {
    const [detections, activations] = await Promise.all([
      this.detectionEventModel
        .find({ user_id: userId })
        .sort({ observed_at: -1 })
        .limit(50)
        .lean(),
      this.activationEventModel
        .find({ user_id: userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    return { detections, activations };
  }

  async createScreenshotJob(userId: string) {
    return this.screenshotJobModel.create({
      user_id: userId,
      status: 'pending',
      expires_at: new Date(Date.now() + SCREENSHOT_JOB_TTL_MS),
    });
  }

  async getScreenshotJob(userId: string, jobId: string) {
    return this.screenshotJobModel
      .findOne({
        _id: jobId,
        user_id: userId,
        expires_at: { $gt: new Date() },
      })
      .lean();
  }

  async getSettings(userId: string) {
    return this.userSettingsModel.findOne({ user_id: userId }).lean();
  }

  async updateSettings(userId: string, settings: GogosenseSettingsDto) {
    const update: Record<string, boolean> = {};

    if (settings.enabled !== undefined) {
      update.enabled = settings.enabled;
    }
    if (settings.usageStatsEnabled !== undefined) {
      update.usage_stats_enabled = settings.usageStatsEnabled;
    }
    if (settings.notificationListenerEnabled !== undefined) {
      update.notification_listener_enabled =
        settings.notificationListenerEnabled;
    }
    if (settings.screenshotRecoveryEnabled !== undefined) {
      update.screenshot_recovery_enabled = settings.screenshotRecoveryEnabled;
    }

    return this.userSettingsModel
      .findOneAndUpdate(
        { user_id: userId },
        {
          $set: update,
        },
        { new: true, upsert: true },
      )
      .lean();
  }
}
