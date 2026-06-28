import type {
  GoGoTrackActivationRequest,
  GoGoTrackActivationResponse,
  GoGoTrackDetectionRequest,
  GoGoTrackDetectionResponse,
} from "./api";
import type { GoGoTrackDetector } from "./detector";
import { createGoGoTrackDetectionRunner } from "./detectionRunner";

export type GoGoTrackMatch = {
  packageName: string;
  response: GoGoTrackDetectionResponse;
};

export type GoGoTrackSessionState = {
  supported: boolean;
  permissionGranted: boolean;
  running: boolean;
  lastMatch: GoGoTrackMatch | null;
};

type SessionApi = {
  detect(
    request: GoGoTrackDetectionRequest,
  ): Promise<GoGoTrackDetectionResponse>;
  activate?(
    request: GoGoTrackActivationRequest,
  ): Promise<GoGoTrackActivationResponse>;
};

export type GoGoTrackStartResult =
  | { started: true }
  | {
      started: false;
      reason: "android_unsupported" | "usage_permission_denied";
    };

export type GoGoTrackSessionOptions = {
  api: SessionApi;
  detector: GoGoTrackDetector;
  appVersion?: string;
  cooldownMs?: number;
  now?: () => Date;
  onChange?: () => void;
};

/**
 * Pure orchestration over the detection runner: Usage-Access permission flow,
 * start/stop lifecycle, polling, and the surfaced merchant match. Node-testable
 * (no React) — the `useGoGoTrack` hook is a thin wrapper that re-renders on
 * `onChange`. Foreground-only MVP: the poll cadence is driven by the caller.
 */
export function createGoGoTrackSession(options: GoGoTrackSessionOptions) {
  let permissionGranted = false;
  let running = false;
  let lastMatch: GoGoTrackMatch | null = null;
  let matchedDuringPoll = false;

  const emitChange = () => options.onChange?.();

  const runner = createGoGoTrackDetectionRunner({
    api: options.api,
    appVersion: options.appVersion,
    cooldownMs: options.cooldownMs,
    detector: options.detector,
    now: options.now,
    onDetection: (event) => {
      if (event.response.matched) {
        matchedDuringPoll = true;
        lastMatch = event;
        emitChange();
      }
    },
  });

  return {
    getState(): GoGoTrackSessionState {
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

    async start(): Promise<GoGoTrackStartResult> {
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
      matchedDuringPoll = false;
      let result: Awaited<ReturnType<typeof runner.pollForegroundPackage>>;
      try {
        result = await runner.pollForegroundPackage();
      } catch {
        if (lastMatch) {
          lastMatch = null;
          emitChange();
        }
        return;
      }
      const shouldClearMatch =
        !result.detected || (!result.suppressed && !matchedDuringPoll);
      if (shouldClearMatch && lastMatch != null) {
        lastMatch = null;
        emitChange();
      }
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
        source: "gototrack",
      });
      return { deeplink: result.deeplink };
    },
  };
}

export type GoGoTrackSession = ReturnType<typeof createGoGoTrackSession>;
