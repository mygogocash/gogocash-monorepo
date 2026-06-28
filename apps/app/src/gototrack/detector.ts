export type GoGoTrackDetector = {
  isAndroidSupported(): boolean;
  hasUsageAccessPermission(): Promise<boolean>;
  openUsageAccessSettings(): Promise<void>;
  hasNotificationListenerPermission(): Promise<boolean>;
  openNotificationListenerSettings(): Promise<void>;
  getCurrentForegroundPackage(): Promise<string | null>;
  startDetection(): Promise<void>;
  stopDetection(): Promise<void>;
};

export function createUnsupportedGoGoTrackDetector(): GoGoTrackDetector {
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

// The live, platform-selected singleton lives in detectorInstance.ts (it imports
// react-native + the native module and is kept out of the pure node test path).
