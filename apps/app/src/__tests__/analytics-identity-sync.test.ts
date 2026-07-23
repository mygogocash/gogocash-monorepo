import { describe, expect, it } from "vitest";

import { resolveIdentityDecision } from "@mobile/analytics/identitySync";
import type { MobileSession } from "@mobile/auth/session";

// The server sets PostHog distinct_id = Mongo user._id. The client must identify
// with that SAME id so the anonymous device person stitches onto the server
// person. resolveIdentityDecision drives that: it decides identify/reset/none from
// the last-identified id + the current session snapshot. Behavioral tests only.

const authedSession: MobileSession = {
  access_token: "jwt-token",
  _id: "65f0c0ffee1234567890abcd", // Mongo user._id — the backend distinct_id
  region: "TH",
  auth_flow: "login",
  provider: "firebase",
};

describe("resolveIdentityDecision", () => {
  it("given an authenticated session with a backend _id not yet identified > returns identify with that _id", () => {
    const decision = resolveIdentityDecision({
      lastIdentifiedUserId: null,
      session: authedSession,
    });
    expect(decision).toEqual({
      kind: "identify",
      userId: "65f0c0ffee1234567890abcd",
      authFlow: "login",
    });
  });

  it("given the same user already identified > returns none (identify once per session)", () => {
    const decision = resolveIdentityDecision({
      lastIdentifiedUserId: "65f0c0ffee1234567890abcd",
      session: authedSession,
    });
    expect(decision).toEqual({ kind: "none" });
  });

  it("given a different authenticated user than last identified > re-identifies (account switch)", () => {
    const decision = resolveIdentityDecision({
      lastIdentifiedUserId: "old-user-id",
      session: { ...authedSession, _id: "new-user-id", auth_flow: "register" },
    });
    expect(decision).toEqual({
      kind: "identify",
      userId: "new-user-id",
      authFlow: "register",
    });
  });

  it("given no session but a previously identified user > returns reset (logout)", () => {
    const decision = resolveIdentityDecision({
      lastIdentifiedUserId: "65f0c0ffee1234567890abcd",
      session: null,
    });
    expect(decision).toEqual({ kind: "reset" });
  });

  it("given no session and nobody identified yet > returns none", () => {
    const decision = resolveIdentityDecision({
      lastIdentifiedUserId: null,
      session: null,
    });
    expect(decision).toEqual({ kind: "none" });
  });

  it("given an authenticated session WITHOUT a backend _id (demo/dev token) > returns none (never fabricate an id)", () => {
    const decision = resolveIdentityDecision({
      lastIdentifiedUserId: null,
      session: { access_token: "demo-token", auth_flow: "phone", provider: "firebase" },
    });
    expect(decision).toEqual({ kind: "none" });
  });

  it("given a session whose access_token was cleared but _id lingers > returns reset when previously identified", () => {
    const decision = resolveIdentityDecision({
      lastIdentifiedUserId: "65f0c0ffee1234567890abcd",
      session: { _id: "65f0c0ffee1234567890abcd", access_token: "" },
    });
    expect(decision).toEqual({ kind: "reset" });
  });
});
