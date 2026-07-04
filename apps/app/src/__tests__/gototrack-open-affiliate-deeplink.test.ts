import { describe, expect, it, vi } from "vitest";

const { openURL, canOpenURL } = vi.hoisted(() => ({
  openURL: vi.fn(async () => undefined),
  canOpenURL: vi.fn(async () => true),
}));

vi.mock("react-native", () => ({
  Linking: { openURL, canOpenURL },
}));

import { openAffiliateDeeplink } from "@mobile/gototrack/openAffiliateDeeplink";

describe("openAffiliateDeeplink", () => {
  it("openAffiliateDeeplink > given https affiliate url > then opens via Linking", async () => {
    openURL.mockClear();
    canOpenURL.mockResolvedValueOnce(true);

    await openAffiliateDeeplink("https://track.gogocash.co/shopee");

    expect(canOpenURL).toHaveBeenCalledWith("https://track.gogocash.co/shopee");
    expect(openURL).toHaveBeenCalledWith("https://track.gogocash.co/shopee");
  });

  it("openAffiliateDeeplink > given canOpenURL false > then still attempts openURL", async () => {
    openURL.mockClear();
    canOpenURL.mockResolvedValueOnce(false);

    await openAffiliateDeeplink("https://involve.asia/r/123");

    expect(openURL).toHaveBeenCalledWith("https://involve.asia/r/123");
  });

  it("openAffiliateDeeplink > given empty url > then throws", async () => {
    await expect(openAffiliateDeeplink("  ")).rejects.toThrow("Missing affiliate link");
  });
});
