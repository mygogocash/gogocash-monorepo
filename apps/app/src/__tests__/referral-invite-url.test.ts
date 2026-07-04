import { describe, expect, it } from "vitest";

import {
  buildReferralInviteUrl,
  formatInviteLinkDisplay,
  isReferralResourceBlocking,
  resolveReferralInviteLink,
} from "../auth/referralInviteUrl";

describe("buildReferralInviteUrl", () => {
  it("buildReferralInviteUrl > given frontend base and user id > then builds ?referral_id query link", () => {
    expect(buildReferralInviteUrl("https://app-staging.gogocash.co/", "6a488baece2e0da81d6dc255")).toBe(
      "https://app-staging.gogocash.co/?referral_id=6a488baece2e0da81d6dc255",
    );
  });
});

describe("formatInviteLinkDisplay", () => {
  it("formatInviteLinkDisplay > given a long url > then truncates the middle", () => {
    const url = "https://app-staging.gogocash.co/?referral_id=6a488baece2e0da81d6dc255";
    expect(formatInviteLinkDisplay(url)).toBe("https://app-staging.go…2e0da81d6dc255");
  });
});

describe("resolveReferralInviteLink", () => {
  it("resolveReferralInviteLink > given backend mode with user id > then uses live frontend url", () => {
    const resolved = resolveReferralInviteLink({
      frontendUrl: "https://app-staging.gogocash.co",
      userId: "6a488baece2e0da81d6dc255",
      useFixtures: false,
    });

    expect(resolved.inviteUrl).toContain("referral_id=6a488baece2e0da81d6dc255");
    expect(resolved.referralCode).toBe("6A488BAECE2E0DA81D6DC255");
  });

  it("resolveReferralInviteLink > given fixtures mode > then keeps the mock invite link", () => {
    const resolved = resolveReferralInviteLink({
      frontendUrl: "https://app-staging.gogocash.co",
      userId: "6a488baece2e0da81d6dc255",
      useFixtures: true,
    });

    expect(resolved.inviteUrl).toContain("mock-user-001");
    expect(resolved.displayLink).toContain("gogocash.co");
  });
});

describe("isReferralResourceBlocking", () => {
  it("isReferralResourceBlocking > given empty referral list > then does not block the referral page", () => {
    expect(isReferralResourceBlocking("empty")).toBe(false);
    expect(isReferralResourceBlocking("ready")).toBe(false);
  });

  it("isReferralResourceBlocking > given loading or error > then blocks the referral page", () => {
    expect(isReferralResourceBlocking("loading")).toBe(true);
    expect(isReferralResourceBlocking("error")).toBe(true);
  });
});
