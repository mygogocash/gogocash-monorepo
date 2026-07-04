// Backend DTO for GET /user/profile (FirebaseAuthGuard; returns the raw user
// doc, no envelope). Shape verified against the live staging response
// (2026-06-12): Mongo omits unset fields entirely, so everything a fresh
// phone-OTP user lacks (username, wallet, membership_tier, email, mobile) is
// optional. Only fields the mobile app consumes are typed; PII the app never
// renders (email, mobile, id_firebase, …) passes through untyped on purpose.
export type UserProfileResponse = {
  _id: string;
  provider: string;
  country?: string;
  credit_tier?: string;
  membership_tier?: string;
  username?: string;
  /** Stored media ref or absolute URL for the profile photo. */
  avatar_url?: string;
  /** Wallet balance as the backend stores it (string or number). */
  wallet?: string | number;
};

/** Narrow an unknown backend payload to the raw user doc. */
export function isUserProfileResponse(payload: unknown): payload is UserProfileResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return false;
  }
  const candidate = payload as { _id?: unknown; provider?: unknown };
  return typeof candidate._id === "string" && typeof candidate.provider === "string";
}
