import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  clearFirebaseIdTokenCache,
  getCachedFirebaseIdToken,
} from "@mobile/auth/firebaseIdTokenCache";

vi.mock("@mobile/auth/firebaseClient", () => ({
  getFirebaseIdToken: vi.fn(),
}));

const { getFirebaseIdToken } = await import("@mobile/auth/firebaseClient");

describe("getCachedFirebaseIdToken", () => {
  beforeEach(() => {
    clearFirebaseIdTokenCache();
    vi.mocked(getFirebaseIdToken).mockReset();
  });

  it("reuses a cached token without calling Firebase again", async () => {
    vi.mocked(getFirebaseIdToken).mockResolvedValue("token-a");

    await expect(getCachedFirebaseIdToken()).resolves.toBe("token-a");
    await expect(getCachedFirebaseIdToken()).resolves.toBe("token-a");

    expect(getFirebaseIdToken).toHaveBeenCalledTimes(1);
  });

  it("forceRefresh bypasses the cache", async () => {
    vi.mocked(getFirebaseIdToken).mockResolvedValueOnce("token-a").mockResolvedValueOnce("token-b");

    await expect(getCachedFirebaseIdToken()).resolves.toBe("token-a");
    await expect(getCachedFirebaseIdToken(true)).resolves.toBe("token-b");

    expect(getFirebaseIdToken).toHaveBeenCalledTimes(2);
  });

  it("dedupes parallel refreshes into a single Firebase call", async () => {
    let resolveToken!: (value: string) => void;
    vi.mocked(getFirebaseIdToken).mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveToken = resolve;
        }),
    );

    const first = getCachedFirebaseIdToken();
    const second = getCachedFirebaseIdToken();
    resolveToken("token-shared");

    await expect(first).resolves.toBe("token-shared");
    await expect(second).resolves.toBe("token-shared");
    expect(getFirebaseIdToken).toHaveBeenCalledTimes(1);
  });
});
