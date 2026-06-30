import { parseGoGoTrackActivateDeepLink } from "./promptDeepLink";
import { bindDefaultLiveActivityLoader } from "./promptLiveActivityBridge";
import type { GoGoTrackPromptPayload } from "./promptCoordinator";
import {
  configureGoGoTrackPromptCoordinator,
  getGoGoTrackPromptCoordinator,
} from "./promptCoordinatorInstance";

type PromptBridgeApi = Parameters<
  typeof configureGoGoTrackPromptCoordinator
>[0];

/**
 * Wires the shared prompt coordinator once per authenticated GoGoTrack session.
 * Native modules and deep links call into this bridge instead of duplicating
 * activate/deeplink logic.
 */
export function ensureGoGoTrackPromptCoordinator(
  api: PromptBridgeApi,
): NonNullable<ReturnType<typeof getGoGoTrackPromptCoordinator>> {
  bindDefaultLiveActivityLoader();
  const existing = getGoGoTrackPromptCoordinator();
  if (existing) {
    return existing;
  }
  return configureGoGoTrackPromptCoordinator(api);
}

export async function handleGoGoTrackPromptDeepLink(
  url: string,
): Promise<boolean> {
  const payload = parseGoGoTrackActivateDeepLink(url);
  if (!payload) {
    return false;
  }

  const coordinator = getGoGoTrackPromptCoordinator();
  if (!coordinator) {
    return false;
  }

  coordinator.showNativePrompt(payload);
  await coordinator.activateFromNative(payload);
  return true;
}

export function merchantMatchToPromptPayload(input: {
  packageName: string;
  detectionEventId?: string;
  merchantId: string;
  merchantName?: string;
  offerId: number;
  networkMerchantId: number;
}): GoGoTrackPromptPayload {
  return {
    packageName: input.packageName,
    detectionEventId: input.detectionEventId,
    merchantId: input.merchantId,
    merchantName: input.merchantName,
    offerId: input.offerId,
    networkMerchantId: input.networkMerchantId,
  };
}
