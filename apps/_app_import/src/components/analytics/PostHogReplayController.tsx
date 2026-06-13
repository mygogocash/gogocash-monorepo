"use client";

import { getPostHogClient, isPostHogEnabled, shouldDisablePostHogReplay } from "@/lib/posthog";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const PostHogReplayController = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (!isPostHogEnabled()) return;

    const replayClient = getPostHogClient();

    if (shouldDisablePostHogReplay(pathname)) {
      replayClient?.stopSessionRecording?.();
      return;
    }

    replayClient?.startSessionRecording?.();
  }, [pathname]);

  return null;
};

export default PostHogReplayController;
