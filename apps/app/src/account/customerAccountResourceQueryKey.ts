import type { MobileSession } from "@mobile/auth/session";

import type { CustomerAccountResourceId } from "./customerAccountResourceIds";

/** Resources whose backend payloads are identity-scoped and must not leak across sessions. */
export const AUTH_SCOPED_CUSTOMER_ACCOUNT_RESOURCE_IDS = [
  "billing",
  "offers",
  "profile",
  "referral",
  "wallet",
] as const satisfies readonly CustomerAccountResourceId[];

export function resolveCustomerAccountResourceSessionScope(
  resourceId: CustomerAccountResourceId,
  session: Pick<MobileSession, "_id" | "access_token"> | null | undefined,
): string {
  if (!(AUTH_SCOPED_CUSTOMER_ACCOUNT_RESOURCE_IDS as readonly string[]).includes(resourceId)) {
    return "public";
  }

  if (typeof session?._id === "string" && session._id.length > 0) {
    return session._id;
  }

  if (typeof session?.access_token === "string" && session.access_token.length > 0) {
    return `token:${session.access_token}`;
  }

  return "anon";
}

export function resolveCustomerAccountResourceQueryKey({
  apiUrl,
  endpoint,
  resourceId,
  sessionScope,
}: {
  apiUrl: string;
  endpoint: string;
  resourceId: CustomerAccountResourceId;
  sessionScope: string;
}) {
  return ["customer-account-resource", resourceId, endpoint, apiUrl, sessionScope] as const;
}
