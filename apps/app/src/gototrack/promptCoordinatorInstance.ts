import { createGoGoTrackPromptCoordinator } from "./promptCoordinator";
import type {
  GoGoTrackPromptCoordinator,
  GoGoTrackPromptCoordinatorState,
} from "./promptCoordinator";
import { openAffiliateDeeplink } from "./openAffiliateDeeplink";
import { syncBoundLiveActivityWithPromptState } from "./promptLiveActivityBridge";

type PromptCoordinatorApi = Parameters<
  typeof createGoGoTrackPromptCoordinator
>[0]["api"];

let coordinator: GoGoTrackPromptCoordinator | null = null;
const reactListeners = new Set<() => void>();

const defaultPromptCoordinatorSnapshot: GoGoTrackPromptCoordinatorState = {
  nativePromptActive: false,
  activePayload: null,
};

let cachedPromptCoordinatorSnapshot: GoGoTrackPromptCoordinatorState =
  defaultPromptCoordinatorSnapshot;

function syncCachedPromptCoordinatorSnapshot(): void {
  cachedPromptCoordinatorSnapshot =
    coordinator?.getState() ?? defaultPromptCoordinatorSnapshot;
}

function notifyReactSubscribers(): void {
  syncCachedPromptCoordinatorSnapshot();
  for (const listener of reactListeners) {
    listener();
  }
}

export function getGoGoTrackPromptCoordinator(): GoGoTrackPromptCoordinator | null {
  return coordinator;
}

export function subscribeGoGoTrackPromptCoordinator(
  listener: () => void,
): () => void {
  reactListeners.add(listener);
  return () => {
    reactListeners.delete(listener);
  };
}

export function getGoGoTrackPromptCoordinatorSnapshot(): GoGoTrackPromptCoordinatorState {
  return cachedPromptCoordinatorSnapshot;
}

export function configureGoGoTrackPromptCoordinator(
  api: PromptCoordinatorApi,
): GoGoTrackPromptCoordinator {
  coordinator = createGoGoTrackPromptCoordinator({
    api,
    openUrl: (url) => openAffiliateDeeplink(url),
    onChange: () => {
      notifyReactSubscribers();
      if (!coordinator) {
        return;
      }
      syncBoundLiveActivityWithPromptState(coordinator.getState());
    },
  });
  notifyReactSubscribers();
  return coordinator;
}

export function resetGoGoTrackPromptCoordinatorForTests(): void {
  coordinator = null;
  cachedPromptCoordinatorSnapshot = defaultPromptCoordinatorSnapshot;
  for (const listener of reactListeners) {
    listener();
  }
}
