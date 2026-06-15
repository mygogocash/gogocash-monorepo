import type {
  GoGoSenseActivationRequest,
  GoGoSenseActivationResponse,
  GoGoSenseDetectionRequest,
  GoGoSenseDetectionResponse,
} from "./api";
import type { GoGoSenseDetector } from "./detector";
import { createGoGoSenseDetectionRunner } from "./detectionRunner";

export type GoGoSenseMatch = {
  packageName: string;
  response: GoGoSenseDetectionResponse;
};

export type GoGoSenseSessionState = {
  supported: boolean;
  permissionGranted: boolean;
  running: boolean;
  lastMatch: GoGoSenseMatch | null;
};

type SessionApi = {
  detect(request: GoGoSenseDetectionRequest): Promise<GoGoSenseDetectionResponse>;
  activate?(request: GoGoSenseActivationRequest): Promise<GoGoSenseActivationResponse>;
};

export type GoGoSenseStartResult =
  | { started: true }
  | { started: false; reason: "android_unsupported" | "usage_permission_denied" };

export type GoGoSenseSessionOptions = {
  api: SessionApi;
  detector: GoGoSenseDetector;
  appVersion?: string;
  cooldownMs?: number;
  now?: () => Date;
  onChange?: () => void;
};

/**
 * Pure orchestration over the detection runner: Usage-Access permission flow,
 * start/stop lifecycle, polling, and the surfaced merchant match. Node-testable
 * (no React) — the `useGoGoSense` hook is a thin wrapper that re-renders on
 * `onChange`. Foreground-only MVP: the poll cadence is driven by the caller.
 */
export function createGoGoSenseSession(options: GoGoSenseSessionOptions) {
  let permissionGranted = false;
  let running = false;
  let lastMatch: GoGoSenseMatch | null = null;

  const emitChange = () => options.onChange?.();

  const runner = createGoGoSenseDetectionRunner({
    api: options.api,
    appVersion: options.appVersion,
    cooldownMs: options.cooldownMs,
    detector: options.detector,
    now: options.now,
    onDetection: (event) => {
      if (event.response.matched) {
        lastMatch = event;
        emitChange();
      }
    },
  });

  return {
    getState(): GoGoSenseSessionState {
      return {
        supported: options.detector.isAndroidSupported(),
        permissionGranted,
        running,
        lastMatch,
      };
    },

    async refreshPermission(): Promise<boolean> {
      permissionGranted = await options.detector.hasUsageAccessPermission();
      emitChange();
      return permissionGranted;
    },

    async requestPermission(): Promise<void> {
      await options.detector.openUsageAccessSettings();
    },

    async start(): Promise<GoGoSenseStartResult> {
      const result = await runner.start();
      if (result.started) {
        permissionGranted = true;
        running = true;
      } else {
        running = false;
        if (result.reason === "usage_permission_denied") {
          permissionGranted = false;
        }
      }
      emitChange();
      return result.started
        ? { started: true }
        : { started: false, reason: result.reason };
    },

    async stop(): Promise<void> {
      running = false;
      await runner.stop();
      emitChange();
    },

    async poll(): Promise<void> {
      await runner.pollForegroundPackage();
    },

    // Activates cashback for the surfaced match: turns lastMatch into an
    // activation request, returns the tracking deeplink for the caller to open.
    // Null when there's no actionable match or the api can't activate.
    async activate(): Promise<{ deeplink: string } | null> {
      const match = lastMatch?.response;
      if (
        !match?.matched ||
        match.merchantId == null ||
        match.offerId == null ||
        match.networkMerchantId == null ||
        !options.api.activate
      ) {
        return null;
      }
      const result = await options.api.activate({
        detectionEventId: match.detectionEventId,
        merchantId: match.merchantId,
        offerId: match.offerId,
        networkMerchantId: match.networkMerchantId,
        source: "gogosense",
      });
      return { deeplink: result.deeplink };
    },
  };
}

export type GoGoSenseSession = ReturnType<typeof createGoGoSenseSession>;
