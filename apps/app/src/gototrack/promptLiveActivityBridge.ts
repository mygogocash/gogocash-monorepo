import type { GototrackLiveActivityPayload } from "../../modules/gototrack-live-activity";
import type {
  GoGoTrackPromptCoordinatorState,
  GoGoTrackPromptPayload,
} from "./promptCoordinator";

export type GototrackLiveActivityModuleLike = {
  startActivationPrompt(payload: GototrackLiveActivityPayload): Promise<void>;
  endActivationPrompt(): Promise<void>;
  updateActivationPrompt(payload: GototrackLiveActivityPayload): Promise<void>;
};

type LiveActivityLoader = () => GototrackLiveActivityModuleLike | null;

let liveActivityLoader: LiveActivityLoader | null = null;

export function bindLiveActivityLoader(loader: LiveActivityLoader): void {
  liveActivityLoader = loader;
}

export function getLiveActivityLoader(): LiveActivityLoader {
  return liveActivityLoader ?? (() => null);
}

export function resetLiveActivityLoaderForTests(): void {
  liveActivityLoader = null;
}

export function bindDefaultLiveActivityLoader(): void {
  if (liveActivityLoader) {
    return;
  }

  bindLiveActivityLoader(() => {
    // Lazy require keeps expo-modules-core out of the vitest node path.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadGototrackLiveActivityModule } = require("../../modules/gototrack-live-activity") as typeof import("../../modules/gototrack-live-activity");
    return loadGototrackLiveActivityModule();
  });
}

export function payloadToLiveActivity(
  payload: GoGoTrackPromptPayload,
): GototrackLiveActivityPayload {
  return {
    merchantName: payload.merchantName ?? payload.merchantId,
    merchantId: payload.merchantId,
    detectionEventId: payload.detectionEventId,
    offerId: payload.offerId,
    networkMerchantId: payload.networkMerchantId,
    packageName: payload.packageName,
  };
}

export function syncLiveActivityWithPromptState(
  state: GoGoTrackPromptCoordinatorState,
  module: GototrackLiveActivityModuleLike | null,
): void {
  if (!module) {
    return;
  }

  if (state.nativePromptActive && state.activePayload) {
    void module.startActivationPrompt(payloadToLiveActivity(state.activePayload));
    return;
  }

  void module.endActivationPrompt();
}

export function syncBoundLiveActivityWithPromptState(
  state: GoGoTrackPromptCoordinatorState,
): void {
  syncLiveActivityWithPromptState(state, getLiveActivityLoader()());
}
