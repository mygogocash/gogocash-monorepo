import type {
  GoGoSenseDetectionRequest,
  GoGoSenseDetectionResponse,
} from "./api";
import type { GoGoSenseDetector } from "./detector";

type DetectionApi = {
  detect(request: GoGoSenseDetectionRequest): Promise<GoGoSenseDetectionResponse>;
};

export type GoGoSenseDetectionEvent = {
  packageName: string;
  response: GoGoSenseDetectionResponse;
};

type DetectionRunnerOptions = {
  api: DetectionApi;
  appVersion?: string;
  cooldownMs?: number;
  detector: GoGoSenseDetector;
  now?: () => Date;
  onDetection?: (event: GoGoSenseDetectionEvent) => void;
};

type StartResult =
  | { started: true }
  | { reason: "android_unsupported" | "usage_permission_denied"; started: false };

type PollResult =
  | { detected: false; packageName: null; suppressed: false }
  | { detected: false; packageName: string; suppressed: true }
  | { detected: true; packageName: string; suppressed: false };

const defaultCooldownMs = 5 * 60 * 1000;

export function createGoGoSenseDetectionRunner(options: DetectionRunnerOptions) {
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
      const lastDetectionAt = lastDetectionByPackage.get(packageName);
      if (
        lastDetectionAt !== undefined &&
        observedAt.getTime() - lastDetectionAt < cooldownMs
      ) {
        return { detected: false, packageName, suppressed: true };
      }

      const response = await options.api.detect({
        appVersion: options.appVersion,
        method: "android_package",
        observedAt: observedAt.toISOString(),
        packageName,
        platform: "android",
      });
      lastDetectionByPackage.set(packageName, observedAt.getTime());
      options.onDetection?.({ packageName, response });

      return { detected: true, packageName, suppressed: false };
    },
  };
}
