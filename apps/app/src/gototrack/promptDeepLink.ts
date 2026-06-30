import type { GoGoTrackPromptPayload } from "./promptCoordinator";

const activatePath = "/gototrack/activate";

export function buildGoGoTrackActivateDeepLink(
  payload: GoGoTrackPromptPayload,
): string {
  const params = new URLSearchParams({
    merchantId: payload.merchantId,
    offerId: String(payload.offerId),
    networkMerchantId: String(payload.networkMerchantId),
  });
  if (payload.detectionEventId) {
    params.set("detectionEventId", payload.detectionEventId);
  }
  if (payload.packageName) {
    params.set("packageName", payload.packageName);
  }
  if (payload.merchantName) {
    params.set("merchantName", payload.merchantName);
  }
  return `gogocash://${activatePath.slice(1)}?${params.toString()}`;
}

export function parseGoGoTrackActivateDeepLink(
  url: string,
): GoGoTrackPromptPayload | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "gogocash:" ||
    parsed.hostname !== "gototrack" ||
    parsed.pathname !== "/activate"
  ) {
    return null;
  }

  const merchantId = parsed.searchParams.get("merchantId");
  const offerIdRaw = parsed.searchParams.get("offerId");
  const networkMerchantIdRaw = parsed.searchParams.get("networkMerchantId");
  if (!merchantId || !offerIdRaw || !networkMerchantIdRaw) {
    return null;
  }

  const offerId = Number(offerIdRaw);
  const networkMerchantId = Number(networkMerchantIdRaw);
  if (!Number.isFinite(offerId) || !Number.isFinite(networkMerchantId)) {
    return null;
  }

  return {
    merchantId,
    offerId,
    networkMerchantId,
    detectionEventId: parsed.searchParams.get("detectionEventId") ?? undefined,
    packageName: parsed.searchParams.get("packageName") ?? undefined,
    merchantName: parsed.searchParams.get("merchantName") ?? undefined,
  };
}
