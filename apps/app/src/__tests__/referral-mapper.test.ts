import { describe, expect, it } from "vitest";
import { isReferralPointList } from "../api/referralTypes";
import { mapReferralPointsToInviteRows } from "../api/referralMapper";

// Backend returns Point[] (action: "referral") with referral_id populated as a
// FULL user doc — email/mobile included. The mapper must never let those
// fields through; identity is username or the masked _id only.
const populatedPoint = {
  _id: "p1",
  action: "referral",
  createdAt: "2026-03-28T07:00:00.000Z",
  point: 120,
  referral_id: {
    _id: "64f000000000000000005678",
    email: "leak@example.com",
    mobile: "+66811111111",
    provider: "phone",
    username: "FriendInvite",
  },
  type: "add",
  user_id: { _id: "owner", provider: "phone" },
};

describe("isReferralPointList", () => {
  it("given a bare array of point docs > then narrows (and [] narrows too)", () => {
    expect(isReferralPointList([populatedPoint])).toBe(true);
    expect(isReferralPointList([])).toBe(true);
  });

  it("given an envelope or object > then rejects", () => {
    expect(isReferralPointList({ data: [] })).toBe(false);
    expect(isReferralPointList(null)).toBe(false);
  });
});

describe("mapReferralPointsToInviteRows", () => {
  it("given populated points > then maps date, identity, points, status without PII", () => {
    const rows = mapReferralPointsToInviteRows([populatedPoint]);

    expect(rows).toEqual([
      {
        category: "account",
        date: "3/28/2026",
        point: "120 pts",
        status: "Success",
        user: "FriendInvite",
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain("leak@example.com");
    expect(JSON.stringify(rows)).not.toContain("+66811111111");
  });

  it("given a referred user without a username > then masks the id instead of exposing anything else", () => {
    // Variable (not inline literal) so the extra PII field flows structurally,
    // exactly as the untyped backend payload would.
    const referredWithoutUsername = { _id: "64f000000000000000005678", email: "x@y.z" };
    const rows = mapReferralPointsToInviteRows([
      { ...populatedPoint, referral_id: referredWithoutUsername },
    ]);

    expect(rows[0]?.user).toBe("***5678");
  });

  it("given an empty list > then yields no rows", () => {
    expect(mapReferralPointsToInviteRows([])).toEqual([]);
  });
});
