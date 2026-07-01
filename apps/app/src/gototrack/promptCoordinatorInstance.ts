import { Linking } from "react-native";

import { createGoGoTrackPromptCoordinator } from "./promptCoordinator";
import type { GoGoTrackPromptCoordinator } from "./promptCoordinator";
import { syncBoundLiveActivityWithPromptState } from "./promptLiveActivityBridge";

type PromptCoordinatorApi = Parameters<
  typeof createGoGoTrackPromptCoordinator
>[0]["api"];

let coordinator: GoGoTrackPromptCoordinator | null = null;

export function getGoGoTrackPromptCoordinator(): GoGoTrackPromptCoordinator | null {
  return coordinator;
}

export function configureGoGoTrackPromptCoordinator(
  api: PromptCoordinatorApi,
): GoGoTrackPromptCoordinator {
  coordinator = createGoGoTrackPromptCoordinator({
    api,
    openUrl: (url) => Linking.openURL(url),
    onChange: () => {
      if (!coordinator) {
        return;
      }
      syncBoundLiveActivityWithPromptState(coordinator.getState());
    },
  });
  return coordinator;
}

export function resetGoGoTrackPromptCoordinatorForTests(): void {
  coordinator = null;
}
