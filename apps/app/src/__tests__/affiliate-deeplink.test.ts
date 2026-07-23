import { describe, expect, it, vi } from "vitest";

import { mintUserTrackingLink } from "@mobile/api/affiliateDeeplink";

const BASE = {
  accessToken: "backend-jwt",
  apiUrl: "https://api-staging.gogocash.co",
  deeplink: "",
  merchantId: 103877,
  offerId: 5031,
};

describe("mintUserTrackingLink", () => {
  it("given a successful create-affiliate response > then returns the per-user tracking link", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({
        deeplink:
          "https://invl.me/aff_m?offer_id=103877&aff_id=23854&aff_sub=user_id%3Aabc",
      }),
      ok: true,
    });

    await expect(mintUserTrackingLink({ ...BASE, fetchImpl })).resolves.toBe(
      "https://invl.me/aff_m?offer_id=103877&aff_id=23854&aff_sub=user_id%3Aabc",
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-staging.gogocash.co/involve/create-affiliate",
      expect.objectContaining({
        body: JSON.stringify({
          deeplink: "",
          merchant_id: 103877,
          offer_id: 5031,
        }),
        method: "POST",
      }),
    );
    const headers = fetchImpl.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe("Bearer backend-jwt");
  });

  it("given missing network ids or token > then returns null without calling the API", async () => {
    const fetchImpl = vi.fn();
    await expect(
      mintUserTrackingLink({ ...BASE, fetchImpl, offerId: undefined }),
    ).resolves.toBeNull();
    await expect(
      mintUserTrackingLink({ ...BASE, fetchImpl, merchantId: undefined }),
    ).resolves.toBeNull();
    await expect(
      mintUserTrackingLink({ ...BASE, accessToken: "", fetchImpl }),
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("given a non-ok response or a network failure > then returns null (caller falls back)", async () => {
    await expect(
      mintUserTrackingLink({
        ...BASE,
        fetchImpl: vi.fn().mockResolvedValue({
          json: async () => ({}),
          ok: false,
          status: 500,
        }),
      }),
    ).resolves.toBeNull();
    await expect(
      mintUserTrackingLink({
        ...BASE,
        fetchImpl: vi.fn().mockRejectedValue(new Error("net")),
      }),
    ).resolves.toBeNull();
  });

  it("given a response without a usable deeplink > then returns null", async () => {
    await expect(
      mintUserTrackingLink({
        ...BASE,
        fetchImpl: vi.fn().mockResolvedValue({
          json: async () => ({ deeplink: "" }),
          ok: true,
        }),
      }),
    ).resolves.toBeNull();
  });

  it.each([
    "javascript:alert(1)",
    "/relative/tracking-link",
    "https://user@tracking.example/path",
    "https://:secret@tracking.example/path",
    "https://user:secret@tracking.example/path",
  ])(
    "given an unsafe returned deeplink %p > then returns null",
    async (deeplink) => {
      await expect(
        mintUserTrackingLink({
          ...BASE,
          fetchImpl: vi.fn().mockResolvedValue({
            json: async () => ({ deeplink }),
            ok: true,
          }),
        }),
      ).resolves.toBeNull();
    },
  );

  it("given a mint slower than the timeout > then aborts and returns null so the redirect can fall back to the raw link", async () => {
    vi.useFakeTimers();
    try {
      // A backend mint can be auth + 401 refresh + a retried provider call
      // (PROVIDER_TIMEOUT_MS = 10s each). Simulate one that never resolves; the
      // client must abort at timeoutMs and return null, NOT hang the redirect.
      const fetchImpl = vi.fn(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }),
      );
      const pending = mintUserTrackingLink({
        ...BASE,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 2500,
      });
      await vi.advanceTimersByTimeAsync(2500);
      await expect(pending).resolves.toBeNull();
      expect(
        (fetchImpl.mock.calls[0][1] as { signal?: AbortSignal }).signal,
      ).toBeInstanceOf(AbortSignal);
    } finally {
      vi.useRealTimers();
    }
  });

  it("given a fast successful mint > then clears the timeout and returns the link", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({ deeplink: "https://invl.me/aff_m?aff_sub=user_id%3Aabc" }),
      ok: true,
    });
    await expect(
      mintUserTrackingLink({ ...BASE, fetchImpl, timeoutMs: 2500 }),
    ).resolves.toBe("https://invl.me/aff_m?aff_sub=user_id%3Aabc");
  });
});
