import { afterEach, describe, expect, it, vi } from "vitest";

import { notifyMobileSessionChange } from "../auth/session";
import { syncProfileSessionFields } from "../auth/syncProfileSessionFields";
import {
  getSharedSessionStore,
  resetSharedSessionStoreForTests,
} from "../auth/sharedSessionStore";

vi.mock("../auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/session")>();
  return {
    ...actual,
    notifyMobileSessionChange: vi.fn(),
  };
});

describe("syncProfileSessionFields", () => {
  afterEach(() => {
    resetSharedSessionStoreForTests();
    vi.clearAllMocks();
  });

  it("given the same avatar_url already in session > then skips writes", async () => {
    const setSession = vi.fn(async () => {});
    await getSharedSessionStore(async () => ({
      clearSession: vi.fn(async () => {}),
      getSession: vi.fn(async () => ({
        access_token: "token",
        avatar_url: "local-media:avatar.jpg",
      })),
      setSession,
    }));

    await syncProfileSessionFields({
      _id: "abc",
      provider: "phone",
      avatar_url: "local-media:avatar.jpg",
    });

    expect(setSession).not.toHaveBeenCalled();
    expect(notifyMobileSessionChange).not.toHaveBeenCalled();
  });

  it("given live profile wallet and username > then merges into session", async () => {
    const setSession = vi.fn(async () => {});
    await getSharedSessionStore(async () => ({
      clearSession: vi.fn(async () => {}),
      getSession: vi.fn(async () => ({
        access_token: "token",
        username: "Old Name",
        wallet: "0.00",
      })),
      setSession,
    }));

    await syncProfileSessionFields({
      _id: "abc",
      provider: "phone",
      username: "Kunanon",
      wallet: 125.5,
      membership_tier: "gogopass",
    });

    expect(setSession).toHaveBeenCalledWith({
      access_token: "token",
      username: "Kunanon",
      wallet: "125.5",
      membership_tier: "gogopass",
    });
    expect(notifyMobileSessionChange).toHaveBeenCalled();
  });
});
