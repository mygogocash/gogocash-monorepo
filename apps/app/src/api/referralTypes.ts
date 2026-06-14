// Backend DTO for GET /point/referral-list (FirebaseAuthGuard): a bare array
// of Point docs (action: "referral") with `referral_id` populated as a FULL
// user doc — the backend leaks referred users' PII (email/mobile), so the
// mobile mapper is the privacy boundary. Only safe fields are typed.
export type ReferralPointUser = {
  _id?: string;
  username?: string;
};

export type ReferralPointRecord = {
  _id?: string;
  createdAt?: string;
  point?: number;
  referral_id?: ReferralPointUser | string | null;
  type?: string;
};

/** Narrow an unknown backend payload to the bare referral point list. */
export function isReferralPointList(payload: unknown): payload is ReferralPointRecord[] {
  return Array.isArray(payload);
}
