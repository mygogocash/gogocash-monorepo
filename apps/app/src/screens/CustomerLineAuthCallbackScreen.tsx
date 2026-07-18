import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  exchangeLineAuth,
  LINE_AUTH_DEFAULT_POST_LOGIN_PATH,
  LineAuthExchangeError,
  LineLoginSessionMissingError,
  navigateAfterLineAuthSuccess,
  resumeLineLogin,
} from "@mobile/auth/lineLogin";
import {
  buildLoginRedirectWithCallback,
  sanitizeCallbackPath,
} from "@mobile/auth/routeGuard";
import { persistMobileSession } from "@mobile/auth/session";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { getMobileEnv } from "@mobile/config/env";
import { markIntroModalPending } from "@mobile/features/introModal/introModalSession";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";

type LineCallbackState =
  | "account-disabled"
  | "account-link-failed"
  | "error"
  | "pending"
  | "provider-unavailable"
  | "session-expired"
  | "success";

const lineCallbackCopy: Record<
  LineCallbackState,
  { body: string; title: string }
> = {
  "account-disabled": {
    body: "This GoGoCash account is disabled. Contact support if you need help.",
    title: "Account unavailable",
  },
  "account-link-failed": {
    body: "We could not link your LINE account. Please try again or contact support.",
    title: "Could not finish LINE sign-in",
  },
  error: {
    body: "Something went wrong. Please try again.",
    title: "Could not sign in with LINE",
  },
  pending: {
    body: "Finishing your secure LINE sign-in.",
    title: "Signing you in with LINE",
  },
  "provider-unavailable": {
    body: "LINE sign-in is temporarily unavailable. Please try again.",
    title: "LINE sign-in is unavailable",
  },
  "session-expired": {
    body: "Return to sign in and try LINE again.",
    title: "LINE sign-in expired",
  },
  success: {
    body: "Your GoGoCash session is ready. Redirecting now.",
    title: "Signed in with LINE",
  },
};

export function CustomerLineAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    callbackUrl?: string | string[];
  }>();
  const { replace } = useRouter();
  const tc = useCopy();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LineCallbackState>("pending");
  const completionRef = useRef<Promise<void> | null>(null);
  const callbackPath = useMemo(
    () =>
      sanitizeCallbackPath(
        normalizeParam(params.callbackUrl),
        LINE_AUTH_DEFAULT_POST_LOGIN_PATH,
      ),
    [params.callbackUrl],
  );
  const signInHref = useMemo(
    () => buildLoginRedirectWithCallback(callbackPath),
    [callbackPath],
  );

  useEffect(() => {
    let cancelled = false;
    const completion =
      completionRef.current ?? completeLineCallback(getMobileEnv().apiUrl);
    completionRef.current = completion;

    void completion.then(
      () => {
        if (cancelled) {
          return;
        }
        setState("success");
        void haptics.success();
        navigateAfterLineAuthSuccess(callbackPath, (href) => {
          replace(href as never);
        });
      },
      (error: unknown) => {
        if (cancelled) {
          return;
        }
        setState(toLineCallbackFailureState(error));
        void haptics.error();
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt, callbackPath, replace]);

  const retry = useCallback(() => {
    completionRef.current = null;
    setState("pending");
    setAttempt((current) => current + 1);
  }, []);

  const retryable =
    state === "account-link-failed" ||
    state === "error" ||
    state === "provider-unavailable";
  const copy = lineCallbackCopy[state];

  return (
    <CustomerRouteState
      action={
        retryable
          ? { label: tc("Try again"), onPress: retry }
          : state === "account-disabled" || state === "session-expired"
            ? { href: signInHref, label: tc("Back to sign in") }
            : undefined
      }
      body={tc(copy.body)}
      secondaryAction={
        retryable
          ? { href: signInHref, label: tc("Back to sign in") }
          : undefined
      }
      testID="line-auth-callback-state"
      title={tc(copy.title)}
      variant={
        state === "pending"
          ? "loading"
          : state === "success"
            ? "success"
            : state === "session-expired"
              ? "unauthenticated"
              : "error"
      }
    />
  );
}

async function completeLineCallback(apiUrl: string): Promise<void> {
  const { accessToken, profile } = await resumeLineLogin();
  const session = await exchangeLineAuth({
    accessToken,
    apiUrl,
    profile,
  });
  await persistMobileSession(session);
  markIntroModalPending();
}

function toLineCallbackFailureState(error: unknown): LineCallbackState {
  if (error instanceof LineLoginSessionMissingError) {
    return "session-expired";
  }
  if (error instanceof LineAuthExchangeError) {
    if (error.kind === "session-expired") {
      return "session-expired";
    }
    if (error.kind === "account-disabled") {
      return "account-disabled";
    }
    if (error.kind === "provider-unavailable") {
      return "provider-unavailable";
    }
    if (error.kind === "account-link-failed") {
      return "account-link-failed";
    }
  }

  return "error";
}

function normalizeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
