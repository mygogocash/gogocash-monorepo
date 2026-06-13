"use client";

import { getLocaleFromPathname, trackCompleteRegistration } from "@/lib/analytics";
import { getPostHogAnonymousId, getPostHogClient, isPostHogEnabled } from "@/lib/posthog";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const PostHogAuthSync = () => {
  const pathname = usePathname() || "/";
  const { data: session, status } = useSession();
  const previousUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isPostHogEnabled() || typeof window === "undefined") return;

    const userId = session?.user?._id;

    if (status === "authenticated" && userId) {
      const aliasKey = `posthog_alias:${userId}`;
      const registrationEventKey = `posthog_registration:${userId}`;
      const shouldAlias = Boolean(
        session.user.is_new_user || session.user.auth_flow === "register"
      );

      // 1. Alias first — links anonymous ID to real user ID
      if (shouldAlias && !window.sessionStorage.getItem(aliasKey)) {
        const anonymousId = getPostHogAnonymousId();

        if (anonymousId && anonymousId !== userId) {
          getPostHogClient()?.alias?.(userId, anonymousId);
        }

        window.sessionStorage.setItem(aliasKey, "1");
      }

      // 2. Identify — set person properties
      getPostHogClient()?.identify?.(userId, {
        region: session.user.region || undefined,
        locale: getLocaleFromPathname(pathname),
        login_state: "authenticated",
        platform: "web",
        auth_flow: session.user.auth_flow || undefined,
      });

      // 3. Track registration — now attributed to the correct user
      if (shouldAlias && !window.sessionStorage.getItem(registrationEventKey)) {
        trackCompleteRegistration({
          authProvider: session.user.provider,
          source: "social_auth",
        });
        window.sessionStorage.setItem(registrationEventKey, "1");
      }

      previousUserIdRef.current = userId;
      return;
    }

    if (status === "unauthenticated" && previousUserIdRef.current) {
      getPostHogClient()?.reset?.();
      previousUserIdRef.current = undefined;
    }
  }, [
    pathname,
    session?.user?._id,
    session?.user?.auth_flow,
    session?.user?.is_new_user,
    session?.user?.provider,
    session?.user?.region,
    status,
  ]);

  return null;
};

export default PostHogAuthSync;
