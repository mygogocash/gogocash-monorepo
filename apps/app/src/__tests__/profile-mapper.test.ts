import { describe, expect, it } from "vitest";
import { isUserProfileResponse } from "../api/profileTypes";
import { mapUserProfileToWalletSummary } from "../api/profileMapper";

const fallback = {
  amount: "3,180.24",
  currency: "THB",
  lastUpdated: "Last Updated: 28 Mar 2026 07:00",
  maskedId: "***0001",
  tier: "",
  userId: "mock-user-0001",
  username: "Mock User",
};

// Field set verified against the live staging response (2026-06-12): a fresh
// phone-OTP user has NO username/wallet/membership_tier keys at all.
const freshLiveUser = {
  _id: "684a31c4ddc06da72b9852aa",
  id_firebase: "firebase-uid",
  address: "",
  country: "TH",
  credit_score: 0,
  credit_tier: "starter",
  disabled: false,
  provider: "phone",
  wallet_frozen: false,
};

describe("isUserProfileResponse", () => {
  it("given a raw backend user doc > then narrows", () => {
    expect(isUserProfileResponse(freshLiveUser)).toBe(true);
  });

  it("given the offer-list envelope, arrays, or null > then rejects", () => {
    expect(isUserProfileResponse({ data: [], page: 1 })).toBe(false);
    expect(isUserProfileResponse([freshLiveUser])).toBe(false);
    expect(isUserProfileResponse(null)).toBe(false);
    expect(isUserProfileResponse(fallback)).toBe(false);
  });
});

describe("mapUserProfileToWalletSummary", () => {
  it("given a fully populated user > then maps username, masked id, wallet amount, and tier", () => {
    const summary = mapUserProfileToWalletSummary(
      {
        ...freshLiveUser,
        membership_tier: "starter",
        username: "fronk",
        wallet: "120.50",
      },
      fallback
    );

    expect(summary.username).toBe("fronk");
    expect(summary.maskedId).toBe("***52aa");
    expect(summary.userId).toBe("684a31c4ddc06da72b9852aa");
    expect(summary.amount).toBe("120.50");
    expect(summary.tier).toBe("starter");
    expect(summary.currency).toBe("THB");
  });

  it("given profile without tier but session fallback has gogopass > then uses session tier", () => {
    const summary = mapUserProfileToWalletSummary(freshLiveUser, {
      ...fallback,
      tier: "gogopass",
    });

    expect(summary.tier).toBe("gogopass");
  });

  it("given a fresh user missing optional fields > then falls back per field except tier (no assumed subscription)", () => {
    const summary = mapUserProfileToWalletSummary(freshLiveUser, fallback);

    expect(summary.username).toBe("Mock User");
    expect(summary.amount).toBe("3,180.24");
    expect(summary.tier).toBe("");
    // The id is real even for fresh users — never fall back on it.
    expect(summary.maskedId).toBe("***52aa");
    expect(summary.userId).toBe("684a31c4ddc06da72b9852aa");
  });
});
