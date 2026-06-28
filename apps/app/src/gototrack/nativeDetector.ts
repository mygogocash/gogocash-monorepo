import type { GoGoTrackDetector } from "./detector";

/**
 * JS surface of the `GototrackDetector` Expo native module (Android-only, MVP:
 * UsageStats foreground detection). Notification-listener + screenshot signals
 * are intentionally NOT part of this surface — see the adapter below.
 */
export interface GototrackNativeModule {
  isAndroidSupported(): boolean;
  hasUsageAccessPermission(): Promise<boolean>;
  openUsageAccessSettings(): Promise<void>;
  getCurrentForegroundPackage(): Promise<string | null>;
  startDetection(): Promise<void>;
  stopDetection(): Promise<void>;
}

/**
 * Adapts the Android-native `GototrackDetector` module to the platform-agnostic
 * `GoGoTrackDetector` interface consumed by the detection runner. The native
 * surface only covers UsageStats (the locked MVP scope); the notification-listener
 * methods are filled with safe no-ops here so the full interface is satisfied
 * without shipping the Play-restricted NotificationListenerService yet.
 */
export function createNativeAndroidDetector(
  native: GototrackNativeModule,
): GoGoTrackDetector {
  return {
    isAndroidSupported: () => native.isAndroidSupported(),
    hasUsageAccessPermission: () => native.hasUsageAccessPermission(),
    openUsageAccessSettings: () => native.openUsageAccessSettings(),
    getCurrentForegroundPackage: () => native.getCurrentForegroundPackage(),
    startDetection: () => native.startDetection(),
    stopDetection: () => native.stopDetection(),
    // Deferred signals (UsageStats-only MVP): safe no-ops, never reached by the runner.
    hasNotificationListenerPermission: async () => false,
    openNotificationListenerSettings: async () => undefined,
  };
}
