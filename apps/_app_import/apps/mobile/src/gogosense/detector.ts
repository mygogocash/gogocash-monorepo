export type GoGoSenseDetector = {
  isAndroidSupported(): boolean;
  hasUsageAccessPermission(): Promise<boolean>;
  openUsageAccessSettings(): Promise<void>;
  hasNotificationListenerPermission(): Promise<boolean>;
  openNotificationListenerSettings(): Promise<void>;
  getCurrentForegroundPackage(): Promise<string | null>;
  startDetection(): Promise<void>;
  stopDetection(): Promise<void>;
};

export function createUnsupportedGoGoSenseDetector(): GoGoSenseDetector {
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

export const gogosenseDetector = createUnsupportedGoGoSenseDetector();
