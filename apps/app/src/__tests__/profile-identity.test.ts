import { beforeEach, describe, expect, it, vi } from "vitest";

import { webProfileHeroCard, webProfileWalletSummary } from "@mobile/design/webDesignParity";

const accountDataSource = vi.hoisted(() => ({ current: "backend" as string }));

vi.mock("@mobile/config/env", () => ({
  getMobileEnv: () => ({ accountDataSource: accountDataSource.current }),
}));

import {
  resolveProfileDisplayName,
  resolveProfileLastUpdated,
  resolveProfileMaskedId,
  resolveProfileUserId,
} from "@mobile/account/profileIdentity";

describe("profileIdentity > resolveProfileDisplayName", () => {
  beforeEach(() => {
    accountDataSource.current = "backend";
  });

  it("given a session username > then uses it", () => {
    expect(resolveProfileDisplayName({ username: "Kunanon" })).toBe("Kunanon");
  });

  it("given backend mode without a username > then falls back to the masked mobile, never the fixture", () => {
    // Field bug 2026-07-10: the +66 999999999 test account (no username)
    // rendered as fixture "Mock User" on a LIVE signed-in screen.
    const name = resolveProfileDisplayName({ mobile: "+66999999999", _id: "6a488baece2e0da81d6dc255" });
    expect(name).toBe("***9999");
    expect(name).not.toBe(webProfileWalletSummary.username);
  });

  it("given backend mode with neither username nor mobile > then masks the account id", () => {
    expect(resolveProfileDisplayName({ _id: "6a488baece2e0da81d6dc255" })).toBe("***c255");
  });

  it("given backend mode with an empty session > then returns an empty name (renders as nothing)", () => {
    expect(resolveProfileDisplayName({})).toBe("");
    expect(resolveProfileDisplayName(null)).toBe("");
  });

  it("given fixtures mode > then keeps the design-parity fixture name", () => {
    accountDataSource.current = "fixtures";
    expect(resolveProfileDisplayName({})).toBe(webProfileWalletSummary.username);
  });
});

describe("profileIdentity > resolveProfileLastUpdated", () => {
  it("given backend mode > then returns null — there is no real timestamp to show", () => {
    accountDataSource.current = "backend";
    expect(resolveProfileLastUpdated()).toBeNull();
  });

  it("given fixtures mode > then keeps the fixture timestamp for design parity", () => {
    accountDataSource.current = "fixtures";
    expect(resolveProfileLastUpdated()).toBe(webProfileWalletSummary.lastUpdated);
  });
});

describe("profileIdentity > resolveProfileUserId", () => {
  it("given backend mode with a session id > then shows the real account id, not the fixture", () => {
    // Field bug 2026-07-10 (same crosscheck): the hero "USER ID" chip rendered
    // fixture "204815963" — and its copy button copied that fixture value.
    accountDataSource.current = "backend";
    expect(resolveProfileUserId({ _id: "6a488baece2e0da81d6dc255" })).toBe("6a488baece2e0da81d6dc255");
  });

  it("given backend mode without a session id > then returns an empty string", () => {
    accountDataSource.current = "backend";
    expect(resolveProfileUserId({})).toBe("");
    expect(resolveProfileUserId(null)).toBe("");
  });

  it("given fixtures mode > then keeps the fixture hero user id", () => {
    accountDataSource.current = "fixtures";
    expect(resolveProfileUserId({})).toBe(webProfileHeroCard.userId);
  });
});

describe("profileIdentity > resolveProfileMaskedId", () => {
  it("given a session id > then masks to the last four characters", () => {
    accountDataSource.current = "backend";
    expect(resolveProfileMaskedId({ _id: "6a488baece2e0da81d6dc255" })).toBe("***c255");
  });

  it("given no id in backend mode > then returns an empty string, not the fixture", () => {
    accountDataSource.current = "backend";
    expect(resolveProfileMaskedId({})).toBe("");
  });

  it("given fixtures mode > then keeps the fixture masked id", () => {
    accountDataSource.current = "fixtures";
    expect(resolveProfileMaskedId({})).toBe(webProfileWalletSummary.maskedId);
  });
});
