import type { MobileSession } from "@mobile/auth/session";

export function resolvePayoutMethodsSessionScope(
  session: Pick<MobileSession, "_id" | "access_token"> | null | undefined,
): string {
  if (typeof session?._id === "string" && session._id.length > 0) {
    return session._id;
  }

  if (typeof session?.access_token === "string" && session.access_token.length > 0) {
    return `token:${session.access_token}`;
  }

  return "anon";
}

export function resolvePayoutMethodsQueryKey(apiUrl: string, sessionScope: string) {
  return ["payout-methods", apiUrl, sessionScope] as const;
}
