import { useEffect, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";

import {
  ensureGoGoTrackPromptCoordinator,
  merchantMatchToPromptPayload,
} from "@mobile/gototrack/promptBridge";
import { useGoGoTrackApi } from "@mobile/gototrack/useGoGoTrackApi";

/**
 * Deep-link entry for native Accept actions:
 * gogocash://gototrack/activate?merchantId=…&offerId=…
 */
export default function GoGoTrackActivateRoute() {
  const api = useGoGoTrackApi();
  const params = useLocalSearchParams<{
    merchantId?: string;
    offerId?: string;
    networkMerchantId?: string;
    detectionEventId?: string;
    packageName?: string;
    merchantName?: string;
  }>();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!api?.activate || startedRef.current) {
      return;
    }

    const merchantId = params.merchantId;
    const offerId = Number(params.offerId);
    const networkMerchantId = Number(params.networkMerchantId);
    if (!merchantId || !Number.isFinite(offerId) || !Number.isFinite(networkMerchantId)) {
      router.replace("/gototrack");
      return;
    }

    startedRef.current = true;
    const coordinator = ensureGoGoTrackPromptCoordinator({ activate: api.activate });
    const payload = merchantMatchToPromptPayload({
      packageName: params.packageName ?? "unknown",
      detectionEventId: params.detectionEventId,
      merchantId,
      merchantName: params.merchantName,
      offerId,
      networkMerchantId,
    });

    coordinator.showNativePrompt(payload);
    void coordinator.activateFromNative(payload).finally(() => {
      router.replace("/gototrack");
    });
  }, [api, params]);

  return null;
}
