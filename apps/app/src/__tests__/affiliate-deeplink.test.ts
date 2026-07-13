import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
        deeplink: "https://invl.me/aff_m?offer_id=103877&aff_id=23854&aff_sub=user_id%3Aabc",
      }),
      ok: true,
    });

    await expect(mintUserTrackingLink({ ...BASE, fetchImpl })).resolves.toBe(
      "https://invl.me/aff_m?offer_id=103877&aff_id=23854&aff_sub=user_id%3Aabc",
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-staging.gogocash.co/involve/create-affiliate",
      expect.objectContaining({
        body: JSON.stringify({ deeplink: "", merchant_id: 103877, offer_id: 5031 }),
        method: "POST",
      }),
    );
    const headers = fetchImpl.mock.calls[0][1].headers as Record<string, string>;
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
        fetchImpl: vi.fn().mockResolvedValue({ json: async () => ({}), ok: false, status: 500 }),
      }),
    ).resolves.toBeNull();
    await expect(
      mintUserTrackingLink({ ...BASE, fetchImpl: vi.fn().mockRejectedValue(new Error("net")) }),
    ).resolves.toBeNull();
  });

  it("given a response without a usable deeplink > then returns null", async () => {
    await expect(
      mintUserTrackingLink({
        ...BASE,
        fetchImpl: vi.fn().mockResolvedValue({ json: async () => ({ deeplink: "" }), ok: true }),
      }),
    ).resolves.toBeNull();
  });
});

describe("shop detail Shop Now attribution (source signals)", () => {
  const screenSource = readFileSync(
    resolve(__dirname, "../screens/CustomerShopDetailScreen.tsx"),
    "utf8",
  );

  it("mints the per-user link during the redirect overlay and falls back to the raw tracking link", () => {
    // Regression: Shop Now opened the offer's raw tracking_link with NO
    // aff_sub, so conversions could not attribute to the buying user.
    expect(screenSource).toContain("mintUserTrackingLink(");
    expect(screenSource).toMatch(/minted\s*\|\|\s*shop\.trackingUrl/);
  });
});
