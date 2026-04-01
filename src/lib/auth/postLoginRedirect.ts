"use client";

import { getSession } from "next-auth/react";

export const LINK_MYCASHBACK_PATH = "/link-mycashback";

export type PostLoginRedirectSource = "social" | "other";

function getCallbackUrlFromSearch(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

/**
 * After a successful `signIn(..., { redirect: false })`, send new users to the MyCashback linking step.
 * When the login URL includes `?callbackUrl=/path` (e.g. from AuthGuard), that path is used for returning
 * users after sign-in (unless they are new and must complete MyCashback linking).
 * In development, social providers (Facebook / Google / X / Telegram completion) default to home so you
 * can exercise the existing-user flow without the backend marking `is_new_user`.
 */
export async function resolvePostLoginHref(
  source: PostLoginRedirectSource = "other"
): Promise<string> {
  const session = await getSession();
  if (session?.user?.is_new_user === true) {
    return LINK_MYCASHBACK_PATH;
  }
  const callback = getCallbackUrlFromSearch();
  if (callback) {
    return callback;
  }
  if (process.env.NODE_ENV === "development" && source === "social") {
    return "/";
  }
  return "/";
}
