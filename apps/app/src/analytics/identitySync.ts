import type { MobileSession } from "@mobile/auth/session";

// Pure decision logic for the client identity bridge, extracted so it is
// unit-testable without React/PostHog. The server sets PostHog distinct_id =
// Mongo user._id; the client must call identify(user._id) once a session becomes
// authenticated so the anonymous device person stitches onto the same person the
// server events land on. On sign-out the client resets its identity.
//
// The client can only stitch when it actually holds the backend Mongo _id. Real
// backend login/register responses carry it (mapLoginResponseToMobileSession maps
// user._id -> session._id); demo/dev raw-token sessions do NOT, so we deliberately
// do NOT identify those (we never fabricate an id).

export type IdentityDecision =
  | { readonly kind: "identify"; readonly userId: string; readonly authFlow?: string }
  | { readonly kind: "reset" }
  | { readonly kind: "none" };

function sessionAccessTokenIsPresent(session: MobileSession | null): boolean {
  const token = session?.access_token;
  return typeof token === "string" ? token.length > 0 : Boolean(token);
}

/**
 * Decide the next identity action from the last-identified id and the current
 * session snapshot.
 *
 * - authenticated + backend _id, not yet identified (or a different id) -> identify
 * - not authenticated, but we had identified someone -> reset
 * - everything else (unchanged, or authenticated without a backend _id) -> none
 */
export function resolveIdentityDecision(args: {
  readonly lastIdentifiedUserId: string | null;
  readonly session: MobileSession | null;
}): IdentityDecision {
  const { lastIdentifiedUserId, session } = args;

  const isAuthenticated = sessionAccessTokenIsPresent(session);
  const userId = typeof session?._id === "string" && session._id ? session._id : null;

  // Authenticated AND we hold the backend Mongo _id: identify (unless already
  // identified as this exact user). Authenticated without a backend _id (demo/dev
  // token) falls through to "none" — we never fabricate an id to stitch on.
  if (isAuthenticated && userId) {
    if (lastIdentifiedUserId === userId) {
      return { kind: "none" };
    }
    const authFlow =
      typeof session?.auth_flow === "string" && session.auth_flow ? session.auth_flow : undefined;
    return { kind: "identify", userId, authFlow };
  }

  // Not authenticated but we had identified someone: clear the identity (logout).
  if (!isAuthenticated && lastIdentifiedUserId !== null) {
    return { kind: "reset" };
  }

  return { kind: "none" };
}
