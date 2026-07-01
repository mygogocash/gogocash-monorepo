export type GototrackActivateDeepLinkParams = {
  merchantId: string;
  offerId: number;
  networkMerchantId: number;
  detectionEventId?: string;
  merchantName?: string;
  packageName?: string;
};

export function buildGototrackActivateAppDeepLink(
  params: GototrackActivateDeepLinkParams,
): string {
  const search = new URLSearchParams({
    merchantId: params.merchantId,
    offerId: String(params.offerId),
    networkMerchantId: String(params.networkMerchantId),
  });

  if (params.detectionEventId) {
    search.set('detectionEventId', params.detectionEventId);
  }
  if (params.merchantName) {
    search.set('merchantName', params.merchantName);
  }
  if (params.packageName) {
    search.set('packageName', params.packageName);
  }

  return `gogocash://gototrack/activate?${search.toString()}`;
}
