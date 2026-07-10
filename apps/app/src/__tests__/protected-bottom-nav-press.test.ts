import { describe, expect, it } from "vitest";

import {
  isProtectedBottomNavHref,
  queueProtectedBottomNavWhileSessionHydrates,
} from "../auth/protectedBottomNavPress";

describe("queueProtectedBottomNavWhileSessionHydrates", () => {
  it("queueProtectedBottomNavWhileSessionHydrates > given session not ready and Wallet tap > then navigates to /wallet for route self-guard", () => {
    expect(
      queueProtectedBottomNavWhileSessionHydrates("/wallet", { isAuthed: false, ready: false }),
    ).toBe("/wallet");
  });

  it("queueProtectedBottomNavWhileSessionHydrates > given ready logged-out Profile tap > then redirects to login callback", () => {
    expect(
      queueProtectedBottomNavWhileSessionHydrates("/profile", { isAuthed: false, ready: true }),
    ).toBe("/login?callbackUrl=%2Fprofile");
  });

  it("queueProtectedBottomNavWhileSessionHydrates > given ready authed Wallet tap > then keeps /wallet", () => {
    expect(
      queueProtectedBottomNavWhileSessionHydrates("/wallet", { isAuthed: true, ready: true }),
    ).toBe("/wallet");
  });

  it("queueProtectedBottomNavWhileSessionHydrates > given public Home href > then returns null (caller keeps default nav)", () => {
    expect(
      queueProtectedBottomNavWhileSessionHydrates("/", { isAuthed: false, ready: false }),
    ).toBeNull();
    expect(isProtectedBottomNavHref("/")).toBe(false);
    expect(isProtectedBottomNavHref("/wallet")).toBe(true);
  });
});
