import { Injectable } from '@nestjs/common';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { AgentActivateCashbackDto } from './dto/agent-activate-cashback.dto';
import { AgentMatchMerchantDto } from './dto/agent-match-merchant.dto';
import { DetectionPlatform } from './dto/detection-request.dto';
import { buildGototrackActivateAppDeepLink } from './gototrack-agent-deeplink';
import { GototrackService } from './gototrack.service';

type LeanMerchant = {
  merchant_id: string;
  merchant_name: string;
  brand_slug: string;
  cashback_rate?: string;
  supported_platforms?: string[];
};

const ACTIVATION_INSTRUCTIONS =
  'Open the tracked link before checkout. Cashback appears in your GoGoCash wallet after the merchant confirms your order.';

@Injectable()
export class GototrackAgentService {
  constructor(
    private readonly gototrackService: GototrackService,
    private readonly analytics: AnalyticsService,
  ) {}

  async searchMerchants(query?: string) {
    const merchants = (await this.gototrackService.searchMerchants(
      query,
    )) as LeanMerchant[];

    return {
      type: 'gototrack_merchant_options' as const,
      options: merchants.map((merchant) => ({
        merchantId: merchant.merchant_id,
        merchantName: merchant.merchant_name,
        brandSlug: merchant.brand_slug,
        cashbackRate: merchant.cashback_rate,
        platforms: merchant.supported_platforms ?? [],
        recommendedAction: 'match' as const,
      })),
      nextAction:
        merchants.length > 0
          ? ('ask_user_to_select_or_continue' as const)
          : ('search_again' as const),
    };
  }

  async matchMerchant(userId: string, request: AgentMatchMerchantDto) {
    const platform: DetectionPlatform = request.platform ?? 'web';
    const match = await this.gototrackService.detect(userId, {
      method: 'manual',
      merchantHint: request.merchantHint,
      url: request.url,
      packageName: request.packageName,
      observedAt: new Date().toISOString(),
      platform,
    });

    await this.analytics.capture(
      'gototrack_agent_merchant_matched',
      { platform: 'api', userId },
      {
        matched: match.matched,
        merchant_id: match.merchantId,
        conversation_id: request.conversationId,
      },
    );

    return {
      type: 'gototrack_merchant_match' as const,
      matched: match.matched,
      detectionEventId: match.detectionEventId,
      option: match.matched
        ? {
            merchantId: match.merchantId,
            merchantName: match.merchantName,
            brandSlug: match.brandSlug,
            offerId: match.offerId,
            networkMerchantId: match.networkMerchantId,
            cashbackRate: match.cashbackRate,
            recommendedAction: match.recommendedAction,
          }
        : undefined,
      nextAction: match.matched
        ? ('ask_user_to_continue' as const)
        : ('search_again' as const),
    };
  }

  async activateCashback(userId: string, request: AgentActivateCashbackDto) {
    const activation = await this.gototrackService.activate(userId, {
      detectionEventId: request.detectionEventId,
      merchantId: request.merchantId,
      offerId: request.offerId,
      networkMerchantId: request.networkMerchantId,
      source: 'gototrack_agent',
    });

    await this.analytics.capture(
      'gototrack_agent_activation_completed',
      { platform: 'api', userId },
      {
        merchant_id: request.merchantId,
        activation_event_id: activation.activationEventId,
        conversation_id: request.conversationId,
      },
    );

    return {
      type: 'gototrack_activation' as const,
      activationEventId: activation.activationEventId,
      deeplink: activation.deeplink,
      appDeepLink: buildGototrackActivateAppDeepLink({
        merchantId: request.merchantId,
        offerId: request.offerId,
        networkMerchantId: request.networkMerchantId,
        detectionEventId: request.detectionEventId,
        merchantName: request.merchantName,
        packageName: request.packageName,
      }),
      instructions: ACTIVATION_INSTRUCTIONS,
      nextAction: 'open_tracked_link_before_checkout' as const,
    };
  }

  async getTimeline(userId: string) {
    const timeline = await this.gototrackService.getTimeline(userId);

    return {
      type: 'gototrack_timeline' as const,
      detections: timeline.detections,
      activations: timeline.activations,
    };
  }
}
