"use client";

import { getSession } from "next-auth/react";

export const LINK_MYCASHBACK_PATH = "/link-mycashback";

export type PostLoginRedirectSource = "social" | "other";

/**
 * After a successful `signIn(..., { redirect: false })`, send new users to the MyCashback linking step.
 * In development, social providers (Facebook / Google / X / Telegram completion) always go home so you
 * can exercise the existing-user flow without the backend marking `is_new_user`.
 */
export async function resolvePostLoginHref(
  source: PostLoginRedirectSource = "other"
): Promise<string> {
  if (process.env.NODE_ENV === "development" && source === "social") {
    return "/";
  }
  const session = await getSession();
  if (session?.user?.is_new_user === true) {
    return LINK_MYCASHBACK_PATH;
  }
  return "/";
}
