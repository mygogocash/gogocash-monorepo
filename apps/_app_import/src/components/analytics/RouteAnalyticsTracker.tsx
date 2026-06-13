"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { LoginState, trackPageView } from "@/lib/analytics";

const RouteAnalyticsTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const lastTrackedRef = useRef("");

  useEffect(() => {
    if (!pathname || status === "loading") return;

    const search = searchParams?.toString() || "";
    const signature = `${pathname}?${search}`;

    if (lastTrackedRef.current === signature) return;

    lastTrackedRef.current = signature;

    trackPageView({
      pathname,
      search: search ? `?${search}` : "",
      loginState: status === "authenticated" ? "authenticated" : ("guest" as LoginState),
    });
  }, [pathname, searchParams, status]);

  return null;
};

export default RouteAnalyticsTracker;
