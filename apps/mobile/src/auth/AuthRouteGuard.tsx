import { usePathname, useRouter } from "expo-router";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";

import { createAvailableSessionStore, type MobileSession } from "@mobile/auth/session";
import {
  buildProtectedLoginRedirect,
  shouldBlockProductionFixtureData,
} from "@mobile/auth/routeGuard";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { getMobileEnv } from "@mobile/config/env";

type GuardStatus = "allowed" | "blockedFixtureData" | "checking" | "offline" | "redirecting";
type GuardVerification = {
  pathname: string;
  status: GuardStatus;
};

export function AuthRouteGuard({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const env = useMemo(() => getMobileEnv(), []);
  const loginRedirect = buildProtectedLoginRedirect(pathname);
  const [retryKey, setRetryKey] = useState(0);
  const [verification, setVerification] = useState<GuardVerification>(() => ({
    pathname,
    status: loginRedirect ? "checking" : "allowed",
  }));
  const status: GuardStatus = !loginRedirect
    ? "allowed"
    : verification.pathname === pathname
      ? verification.status
      : "checking";

  useEffect(() => {
    let cancelled = false;

    if (!loginRedirect) {
      return;
    }

    async function verifySession() {
      const sessionStore = await createAvailableSessionStore();
      let session: MobileSession | null | undefined = null;

      try {
        session = await sessionStore?.getSession();
      } catch {
        session = null;
      }

      if (cancelled) {
        return;
      }

      if (!session?.access_token) {
        if (isWebRuntimeOffline()) {
          setVerification({ pathname, status: "offline" });
          return;
        }

        setVerification({ pathname, status: "redirecting" });
        router.replace(loginRedirect as never);
        return;
      }

      if (shouldBlockProductionFixtureData(pathname, env.appEnv, env.accountDataSource)) {
        setVerification({ pathname, status: "blockedFixtureData" });
        return;
      }

      setVerification({ pathname, status: "allowed" });
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [env.accountDataSource, env.appEnv, loginRedirect, pathname, retryKey, router]);

  if (!loginRedirect || status === "allowed") {
    return <>{children}</>;
  }

  if (status === "blockedFixtureData") {
    return (
      <CustomerRouteState
        body="Production account data is disabled until authenticated backend reads are enabled for this route."
        title="Account data unavailable"
        variant="error"
      />
    );
  }

  if (status === "offline") {
    return (
      <CustomerRouteState
        action={{
          label: "Try again",
          onPress: () => {
            setVerification({ pathname, status: "checking" });
            setRetryKey((currentKey) => currentKey + 1);
          },
        }}
        body="Reconnect to the internet, then retry your GoGoCash session check."
        title="You are offline"
        variant="offline"
      />
    );
  }

  if (status === "redirecting") {
    return (
      <CustomerRouteState
        body="Redirecting to sign in."
        title="Sign in required"
        variant="unauthenticated"
      />
    );
  }

  return (
    <CustomerRouteState
      body="Checking your GoGoCash session."
      title="Checking session"
      variant="loading"
    />
  );
}

function isWebRuntimeOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
