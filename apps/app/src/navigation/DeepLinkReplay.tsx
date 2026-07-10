import { useEffect } from "react";
import { useRouter } from "expo-router";

import {
  consumePendingDeepLink,
  markNavigatorReady,
  resolveDeepLinkReplayTarget,
} from "@mobile/navigation/pendingDeepLink";

/**
 * Rendered inside AppProviders' ready branch — the same commit that mounts the
 * router Stack. Marks the navigator ready (so live links flow to expo-router)
 * and replays the one deep link, if any, that arrived while the bootstrap gate
 * kept the Stack unmounted. Session `ready` is guaranteed here (the gate
 * requires it), so route self-guards behave normally for the replayed path.
 */
export function DeepLinkReplay() {
  const router = useRouter();

  useEffect(() => {
    markNavigatorReady();
    const url = consumePendingDeepLink();
    if (!url) {
      return;
    }
    const target = resolveDeepLinkReplayTarget(url);
    if (target) {
      router.navigate(target as never);
    }
  }, [router]);

  return null;
}
