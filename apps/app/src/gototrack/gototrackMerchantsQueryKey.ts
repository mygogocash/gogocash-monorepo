export function resolveGoGoTrackMerchantsQueryKey(apiUrl: string) {
  return ["gototrack-merchants", apiUrl] as const;
}

export function resolveGoGoTrackMerchantsOverrideQueryKey(api: object) {
  return ["gototrack-merchants", "override", api] as const;
}
