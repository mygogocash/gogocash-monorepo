import type {
  GoGoTrackDetectionRequest,
  GoGoTrackDetectionResponse,
} from "./api";
import type { GoGoTrackDetector } from "./detector";

type DetectionApi = {
  detect(request: GoGoTrackDetectionRequest): Promise<GoGoTrackDetectionResponse>;
};

export type GoGoTrackDetectionEvent = {
  packageName: string;
  response: GoGoTrackDetectionResponse;
};

type DetectionRunnerOptions = {
  api: DetectionApi;
  appVersion?: string;
  cooldownMs?: number;
  detector: GoGoTrackDetector;
  now?: () => Date;
  onDetection?: (event: GoGoTrackDetectionEvent) => void;
};

type StartResult =
  | { started: true }
  | { reason: "android_unsupported" | "usage_permission_denied"; started: false };

type PollResult =
  | { detected: false; packageName: null; suppressed: false }
  | { detected: false; packageName: string; suppressed: true }
  | { detected: true; packageName: string; suppressed: false };

const defaultCooldownMs = 5 * 60 * 1000;

export function createGoGoTrackDetectionRunner(options: DetectionRunnerOptions) {
  const now = options.now ?? (() => new Date());
  const cooldownMs = options.cooldownMs ?? defaultCooldownMs;
  const lastDetectionByPackage = new Map<string, number>();
  let running = false;

  return {
    async start(): Promise<StartResult> {
      if (!options.detector.isAndroidSupported()) {
        return { reason: "android_unsupported", started: false };
      }

      const hasUsageAccess = await options.detector.hasUsageAccessPermission();
      if (!hasUsageAccess) {
        return { reason: "usage_permission_denied", started: false };
      }

      await options.detector.startDetection();
      running = true;

      return { started: true };
    },

    async stop(): Promise<void> {
      running = false;
      await options.detector.stopDetection();
    },

    async pollForegroundPackage(): Promise<PollResult> {
      if (!running) {
        return { detected: false, packageName: null, suppressed: false };
      }

      const packageName = await options.detector.getCurrentForegroundPackage();
      if (!packageName) {
        return { detected: false, packageName: null, suppressed: false };
      }

      const observedAt = now();
      const observedAtMs = observedAt.getTime();
      const lastDetectionAt = lastDetectionByPackage.get(packageName);
      if (
        lastDetectionAt !== undefined &&
        observedAtMs - lastDetectionAt < cooldownMs
      ) {
        return { detected: false, packageName, suppressed: true };
      }

      lastDetectionByPackage.set(packageName, observedAtMs);
      try {
        const response = await options.api.detect({
          appVersion: options.appVersion,
          method: "android_package",
          observedAt: observedAt.toISOString(),
          packageName,
          platform: "android",
        });
        options.onDetection?.({ packageName, response });
        return { detected: true, packageName, suppressed: false };
      } catch (error) {
        lastDetectionByPackage.delete(packageName);
        throw error;
      }
    },
  };
}
