import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadProfileAvatar } from "../account/profileAvatarResource";
import { getSharedMobileApiClient, resetSharedMobileApiClientForTests } from "../api/sharedClient";
import {
  getSharedSessionStore,
  resetSharedSessionStoreForTests,
} from "../auth/sharedSessionStore";
import type { MobileSessionStore } from "../auth/session";

vi.mock("../api/sharedClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/sharedClient")>();
  return {
    ...actual,
    getSharedMobileApiClient: vi.fn(),
  };
});

function makeStore(): MobileSessionStore {
  return {
    clearSession: vi.fn(async () => {}),
    getSession: vi.fn(async () => ({ access_token: "token" })),
    setSession: vi.fn(async () => {}),
  };
}

describe("uploadProfileAvatar", () => {
  afterEach(() => {
    resetSharedMobileApiClientForTests();
    resetSharedSessionStoreForTests();
    vi.mocked(getSharedMobileApiClient).mockReset();
  });

  it("given a successful upload response > then returns the avatar_url", async () => {
    await getSharedSessionStore(async () => makeStore());
    const postFormData = vi.fn(async () => ({ avatar_url: "local-media:avatar.jpg" }));
    vi.mocked(getSharedMobileApiClient).mockResolvedValue({ postFormData } as never);

    const blob = new Blob(["x"], { type: "image/jpeg" });
    const avatarUrl = await uploadProfileAvatar("https://api.dev.gogocash.co", blob, "avatar.jpg");

    expect(postFormData).toHaveBeenCalledWith("/user/profile/avatar", expect.any(FormData));
    expect(avatarUrl).toBe("local-media:avatar.jpg");
  });

  it("given no session store > then throws", async () => {
    await getSharedSessionStore(async () => null);

    await expect(
      uploadProfileAvatar("https://api.dev.gogocash.co", new Blob(), "avatar.jpg"),
    ).rejects.toThrow("No mobile session store is available.");
  });

  it("given a response without avatar_url > then throws", async () => {
    await getSharedSessionStore(async () => makeStore());
    vi.mocked(getSharedMobileApiClient).mockResolvedValue({
      postFormData: vi.fn(async () => ({})),
    } as never);

    await expect(
      uploadProfileAvatar("https://api.dev.gogocash.co", new Blob(), "avatar.jpg"),
    ).rejects.toThrow("Avatar upload did not return a URL.");
  });
});
