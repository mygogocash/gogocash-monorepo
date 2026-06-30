import type { GoGoTrackDetector } from "./detector";

let lastBackgroundAt: number | null = null;

/**
 * Weak iOS fallback when DeviceActivity entitlement is unavailable: records when
 * GoGoCash backgrounds so the hub banner can prioritize activation on return.
 * Does not detect merchant apps while GoGoCash is backgrounded.
 */
export function createIosAppStateFallbackDetector(
  subscribeAppState: (
    listener: (state: "active" | "background" | "inactive") => void,
  ) => () => void,
): GoGoTrackDetector {
  subscribeAppState((state) => {
    if (state === "background" || state === "inactive") {
      lastBackgroundAt = Date.now();
    }
  });

  return {
    isAndroidSupported: () => false,
    hasUsageAccessPermission: async () => false,
    openUsageAccessSettings: async () => undefined,
    hasNotificationListenerPermission: async () => false,
    openNotificationListenerSettings: async () => undefined,
    getCurrentForegroundPackage: async () => null,
    startDetection: async () => undefined,
    stopDetection: async () => undefined,
  };
}

export function getIosAppStateFallbackLastBackgroundAt(): number | null {
  return lastBackgroundAt;
}

export function resetIosAppStateFallbackForTests(): void {
  lastBackgroundAt = null;
}
