export type GoGoTrackActivationResult = {
  deeplink: string;
};

export function resolveGoGoTrackActivationKey(input: {
  detectionEventId?: string;
  merchantId: string;
  offerId: number;
  networkMerchantId: number;
}): string {
  if (input.detectionEventId) {
    return `detection:${input.detectionEventId}`;
  }

  return `merchant:${input.merchantId}:${input.offerId}:${input.networkMerchantId}`;
}

let inFlightKey: string | null = null;
let inFlightPromise: Promise<GoGoTrackActivationResult | null> | null = null;

export async function runExclusiveGoGoTrackActivation(
  key: string,
  activate: () => Promise<GoGoTrackActivationResult | null>,
): Promise<GoGoTrackActivationResult | null> {
  if (inFlightPromise && inFlightKey === key) {
    return inFlightPromise;
  }

  const promise = activate().finally(() => {
    if (inFlightKey === key && inFlightPromise === promise) {
      inFlightKey = null;
      inFlightPromise = null;
    }
  });

  inFlightKey = key;
  inFlightPromise = promise;
  return promise;
}

export function resetGoGoTrackActivationMutexForTests(): void {
  inFlightKey = null;
  inFlightPromise = null;
}
