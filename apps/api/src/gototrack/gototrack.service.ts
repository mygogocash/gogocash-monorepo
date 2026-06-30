import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  requireObjectId,
  requireObjectIdHex,
  mongoFilter,
  requireFiniteNumber,
  requireTrimmedString,
} from 'src/common/mongo-query';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { InvolveService } from 'src/involve/involve.service';
import { ActivationRequestDto } from './dto/activation-request.dto';
import { DetectionRequestDto } from './dto/detection-request.dto';
import { GototrackSettingsDto } from './dto/gototrack-settings.dto';
import {
  GototrackActivationEvent,
  GototrackActivationEventDocument,
} from './schemas/gototrack-activation-event.schema';
import {
  GototrackDetectionEvent,
  GototrackDetectionEventDocument,
} from './schemas/gototrack-detection-event.schema';
import {
  GototrackMerchant,
  GototrackMerchantDocument,
} from './schemas/gototrack-merchant.schema';
import {
  GototrackScreenshotJob,
  GototrackScreenshotJobDocument,
} from './schemas/gototrack-screenshot-job.schema';
import {
  GototrackUserSettings,
  GototrackUserSettingsDocument,
} from './schemas/gototrack-user-settings.schema';

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

const sanitizeDetectionUrl = (url?: string) => {
  const domain = normalizeDomain(url);
  return domain ? `https://${domain}` : undefined;
};

const sanitizeDetectionText = (text?: string) => {
  if (!text) return undefined;

  const sanitized = text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b\d{8,}\b/g, '[redacted-number]')
    .replace(/\+?\b(?:\d[\d\s().-]{7,}\d)\b/g, '[redacted-phone]')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized ? sanitized.slice(0, 240) : undefined;
};

const sanitizeDetectionRequest = (request: DetectionRequestDto) => ({
  ...request,
  url: sanitizeDetectionUrl(request.url),
  notificationText: sanitizeDetectionText(request.notificationText),
});

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

type AffiliateNetworkError = {
  response?: {
    status?: number;
    data?: {
      status_code?: number;
    };
  };
};

const GOGOSENSE_DEEPLINK_UNAVAILABLE = 'GOGOSENSE_DEEPLINK_UNAVAILABLE';

function getAffiliateNetworkStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const response = (error as AffiliateNetworkError).response;
  return response?.data?.status_code ?? response?.status;
}

@Injectable()
export class GototrackService {
  constructor(
    @InjectModel(GototrackMerchant.name)
    private readonly merchantModel: Model<GototrackMerchantDocument>,
    @InjectModel(GototrackDetectionEvent.name)
    private readonly detectionEventModel: Model<GototrackDetectionEventDocument>,
    @InjectModel(GototrackActivationEvent.name)
    private readonly activationEventModel: Model<GototrackActivationEventDocument>,
    @InjectModel(GototrackScreenshotJob.name)
    private readonly screenshotJobModel: Model<GototrackScreenshotJobDocument>,
    @InjectModel(GototrackUserSettings.name)
    private readonly userSettingsModel: Model<GototrackUserSettingsDocument>,
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
    const detectionRequest = sanitizeDetectionRequest(request);
    const settings = await this.getSettings(userId);
    if (settings?.enabled === false) {
      throw new BadRequestException('GoGoTrack tracking is disabled');
    }
    if (
      detectionRequest.method === 'android_package' &&
      settings?.usage_stats_enabled === false
    ) {
      throw new BadRequestException('Usage access detection is disabled');
    }
    if (
      detectionRequest.method === 'notification' &&
      settings?.notification_listener_enabled === false
    ) {
      throw new BadRequestException('Notification detection is disabled');
    }
    if (
      detectionRequest.method === 'screenshot_ocr' &&
      settings?.screenshot_recovery_enabled === false
    ) {
      throw new BadRequestException('Screenshot recovery is disabled');
    }
    if (
      detectionRequest.method === 'screenshot_ocr' &&
      !detectionRequest.screenshotJobId
    ) {
      throw new BadRequestException(
        'Screenshot recovery job is required for screenshot OCR detection',
      );
    }
    const match = await this.matchMerchant(detectionRequest);
    if (detectionRequest.screenshotJobId) {
      const screenshotJob = await this.getScreenshotJob(
        userId,
        detectionRequest.screenshotJobId,
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
      url: detectionRequest.url,
      notification_text: detectionRequest.notificationText,
      screenshot_job_id: detectionRequest.screenshotJobId,
      observed_at: new Date(request.observedAt),
      platform: request.platform,
      app_version: request.appVersion,
      recommended_action: match.recommendedAction,
    });

    if (match.matched) {
      await this.analytics.capture(
        'gototrack_merchant_detected',
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
    const validatedUserId = this.validatedUserId(userId);
    if (request.source === 'gototrack') {
      const settings = await this.getSettings(validatedUserId);
      if (settings?.enabled === false) {
        throw new BadRequestException('GoGoTrack tracking is disabled');
      }
    }
    await this.assertDetectionEventMatchesActivation(validatedUserId, request);

    if (request.detectionEventId) {
      const existingActivation = await this.activationEventModel
        .findOne(
          mongoFilter({
            user_id: validatedUserId,
            detection_event_id: requireObjectIdHex(
              request.detectionEventId,
              'detection event id',
            ),
          }),
        )
        .lean();

      if (existingActivation) {
        throw new BadRequestException(
          'GoGoTrack detection event has already been activated',
        );
      }
    }

    let deeplinkDoc: unknown;
    try {
      deeplinkDoc = await this.involveService.createAffiliate(
        {
          offer_id: request.offerId,
          merchant_id: request.networkMerchantId,
          deeplink: '',
        },
        validatedUserId,
      );
    } catch (error) {
      const upstreamStatusCode = getAffiliateNetworkStatusCode(error);
      if ([400, 404, 422].includes(upstreamStatusCode ?? 0)) {
        throw new HttpException(
          {
            message:
              'GoGoTrack deeplink is unavailable for this merchant activation.',
            code: GOGOSENSE_DEEPLINK_UNAVAILABLE,
            upstreamStatusCode,
          },
          422,
        );
      }

      throw error;
    }
    const deeplink =
      (deeplinkDoc as { deeplink?: string; tracking_link?: string })
        ?.deeplink ||
      (deeplinkDoc as { tracking_link?: string })?.tracking_link ||
      '';

    const activation = await this.activationEventModel.create({
      user_id: validatedUserId,
      detection_event_id: request.detectionEventId,
      merchant_id: request.merchantId,
      offer_id: request.offerId,
      network_merchant_id: request.networkMerchantId,
      source: request.source,
      deeplink,
    });

    await this.analytics.capture(
      'gototrack_activation_completed',
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
      if (request.source === 'gototrack') {
        throw new BadRequestException(
          'GoGoTrack activation requires a detection event',
        );
      }

      return;
    }

    const detectionEventId = requireObjectId(
      request.detectionEventId,
      'detection event id',
    );

    const detectionEvent = await this.detectionEventModel
      .findOne(
        mongoFilter({
          _id: detectionEventId,
          user_id: userId,
          merchant_id: requireTrimmedString(
            request.merchantId,
            128,
            'merchant id',
          ),
          network_merchant_id: requireFiniteNumber(
            request.networkMerchantId,
            'network merchant id',
          ),
          matched: true,
        }),
      )
      .lean();

    if (!detectionEvent) {
      throw new BadRequestException(
        'Invalid GoGoTrack detection event for activation',
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
    const settings = await this.userSettingsModel
      .findOne({ user_id: userId })
      .lean();
    if (
      settings &&
      (settings.enabled === false ||
        settings.screenshot_recovery_enabled === false)
    ) {
      throw new BadRequestException('Screenshot recovery is disabled');
    }
    return this.screenshotJobModel.create({
      user_id: userId,
      status: 'pending',
      expires_at: new Date(Date.now() + SCREENSHOT_JOB_TTL_MS),
    });
  }

  async getScreenshotJob(userId: string, jobId: string) {
    const validatedUserId = this.validatedUserId(userId);
    const validatedJobId = requireObjectId(jobId, 'screenshot job id');
    return this.screenshotJobModel
      .findOne({
        _id: validatedJobId,
        user_id: validatedUserId,
        expires_at: { $gt: new Date() },
      })
      .lean();
  }

  async getSettings(userId: string) {
    return this.userSettingsModel.findOne({ user_id: userId }).lean();
  }

  async updateSettings(userId: string, settings: GototrackSettingsDto) {
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
    if (settings.backgroundPromptsEnabled !== undefined) {
      update.background_prompts_enabled = settings.backgroundPromptsEnabled;
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

  private validatedUserId(userId: string): string {
    return requireObjectId(userId, 'user id').toHexString();
  }
}
