import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import {
  persistMobileSession,
  type MobileSession,
} from "@mobile/auth/session";
import { sanitizeCallbackPath } from "@mobile/auth/routeGuard";
import {
  CustomerRouteState,
  type CustomerRouteStateVariant,
} from "@mobile/components/CustomerRouteState";
import { getMobileEnv } from "@mobile/config/env";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";

type CallbackState = "error" | "missing" | "pending" | "success";

export function CustomerAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    callbackUrl?: string | string[];
    code?: string | string[];
    state?: string | string[];
    token?: string | string[];
  }>();
  const router = useRouter();
  const tc = useCopy();
  const [state, setState] = useState<CallbackState>("pending");
  const callbackUrl = useMemo(
    () => sanitizeCallbackPath(normalizeParam(params.callbackUrl)),
    [params.callbackUrl]
  );
  const code = useMemo(() => normalizeParam(params.code), [params.code]);
  const providerState = useMemo(() => normalizeParam(params.state), [params.state]);
  const token = useMemo(() => normalizeTokenParam(params.token), [params.token]);

  useEffect(() => {
    let cancelled = false;

    async function completeTokenHandoff() {
      if (!code && !token) {
        setState("missing");
        return;
      }

      try {
        const callbackSession = code
          ? await exchangeMobileAuthCode({ code, state: providerState })
          : createDevRawTokenSession(token);

        await persistCallbackSession(callbackSession);

        if (cancelled) {
          return;
        }

        setState("success");
        router.replace(callbackUrl as never);
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    void completeTokenHandoff();

    return () => {
      cancelled = true;
    };
  }, [callbackUrl, code, providerState, router, token]);

  // Native haptic feedback, gated to fire once per status transition (this effect
  // re-runs only when `state` changes, not on every render): a success cue when
  // the token handoff completes, an error cue on the expired/failed terminal
  // states. No-op on web; failures are swallowed inside the haptics wrapper.
  useEffect(() => {
    if (state === "success") {
      void haptics.success();
    } else if (state === "error" || state === "missing") {
      void haptics.error();
    }
  }, [state]);

  return (
    <CustomerRouteState
      action={
        state === "error" || state === "missing"
          ? { href: "/login", label: tc("Back to sign in") }
          : undefined
      }
      body={tc(getBody(state))}
      title={tc(getTitle(state))}
      variant={getRouteStateVariant(state)}
    />
  );
}

function normalizeTokenParam(token: string | string[] | undefined) {
  const normalizedToken = normalizeParam(token);

  return validateCallbackToken(normalizedToken) ? normalizedToken : "";
}

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function validateCallbackToken(token: string) {
  return token.length > 0 && token.length <= 4096 && !/[\u0000-\u001F\u007F]/.test(token);
}

async function exchangeMobileAuthCode({
  code,
  state,
}: {
  code: string;
  state: string;
}): Promise<MobileSession> {
  if (!validateCallbackToken(code) || !validateCallbackToken(state)) {
    throw new Error("Invalid auth callback code.");
  }

  const env = getMobileEnv();
  const response = await fetch(`${env.apiUrl.replace(/\/+$/, "")}/auth/mobile/callback`, {
    body: JSON.stringify({ code, state }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Auth callback exchange failed.");
  }

  const session = (await response.json()) as MobileSession;

  if (!session || typeof session.access_token !== "string" || !session.access_token) {
    throw new Error("Auth callback exchange returned an invalid session.");
  }

  return session;
}

function createDevRawTokenSession(validatedToken: string): MobileSession {
  const env = getMobileEnv();

  if (env.appEnv === "production") {
    throw new Error("Raw token callback is disabled for production builds.");
  }

  if (!validateCallbackToken(validatedToken)) {
    throw new Error("Invalid auth callback token.");
  }

  return {
    access_token: validatedToken,
    auth_flow: "telegram",
    email: "",
    provider: "firebase",
  } satisfies MobileSession;
}

async function persistCallbackSession(callbackSession: MobileSession) {
  await persistMobileSession(callbackSession);
}

function getTitle(state: CallbackState) {
  if (state === "success") {
    return "Signed in";
  }

  if (state === "missing") {
    return "Sign-in link expired";
  }

  if (state === "error") {
    return "Sign-in failed";
  }

  return "Signing you in";
}

function getBody(state: CallbackState) {
  if (state === "success") {
    return "Your Firebase session was saved. Redirecting to GoGoCash.";
  }

  if (state === "missing") {
    return "Open the latest sign-in link and try again.";
  }

  if (state === "error") {
    return "GoGoCash could not complete the secure token handoff.";
  }

  return "Saving your Firebase token and preparing your GoGoCash session.";
}

function getRouteStateVariant(state: CallbackState): CustomerRouteStateVariant {
  if (state === "error") {
    return "error";
  }

  if (state === "missing") {
    return "unauthenticated";
  }

  if (state === "success") {
    return "success";
  }

  return "loading";
}
