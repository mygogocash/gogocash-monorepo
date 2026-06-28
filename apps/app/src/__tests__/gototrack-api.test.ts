import { describe, expect, it, vi } from "vitest";

import { createGoGoTrackApi } from "@mobile/gototrack/api";
import type { GoGoTrackBaseClient } from "@mobile/gototrack/api";

function createBaseClient() {
  return {
    get: vi.fn(async () => ({
      ok: true,
    })) as unknown as GoGoTrackBaseClient["get"],
    post: vi.fn(async () => ({
      ok: true,
    })) as unknown as GoGoTrackBaseClient["post"],
  } as GoGoTrackBaseClient & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
}

describe("GoGoTrack mobile API wrapper", () => {
  it("detection api > given package detection > then posts detection body to backend", async () => {
    const baseClient = createBaseClient();
    const api = createGoGoTrackApi(baseClient);

    await api.detect({
      method: "android_package",
      packageName: "com.shopee.th",
      observedAt: "2026-05-23T09:00:00.000Z",
      platform: "android",
    });

    expect(baseClient.post).toHaveBeenCalledWith("/gototrack/detect", {
      method: "android_package",
      packageName: "com.shopee.th",
      observedAt: "2026-05-23T09:00:00.000Z",
      platform: "android",
    });
  });

  it("activation api > given matched merchant > then posts activation body to backend", async () => {
    const baseClient = createBaseClient();
    const api = createGoGoTrackApi(baseClient);

    await api.activate({
      detectionEventId: "detection-1",
      merchantId: "merchant-shopee",
      offerId: 101,
      networkMerchantId: 201,
      source: "gototrack",
    });

    expect(baseClient.post).toHaveBeenCalledWith("/gototrack/activate", {
      detectionEventId: "detection-1",
      merchantId: "merchant-shopee",
      offerId: 101,
      networkMerchantId: 201,
      source: "gototrack",
    });
  });

  it("settings api > given partial settings > then posts settings body to backend", async () => {
    const baseClient = createBaseClient();
    const api = createGoGoTrackApi(baseClient);

    await api.updateSettings({ enabled: true });

    expect(baseClient.post).toHaveBeenCalledWith("/gototrack/settings", {
      enabled: true,
    });
  });
  it("detect > minimizes URL and notification text before upload", async () => {
    const baseClient = createBaseClient();
    const api = createGoGoTrackApi(baseClient);

    await api.detect({
      method: "notification",
      notificationText:
        "Shopee order 123456789 for +66 81 234 5678 user test@example.com https://merchant.example/receipt?token=secret",
      observedAt: "2026-05-23T09:00:00.000Z",
      platform: "android",
      url: "https://pages.lazada.co.th/wow/i/th/campaign?token=secret#fragment",
    });

    expect(baseClient.post).toHaveBeenCalledWith(
      "/gototrack/detect",
      expect.objectContaining({
        method: "notification",
        notificationText:
          "Shopee order [redacted-number] for [redacted-phone] user [redacted-email] [redacted-url]",
        observedAt: "2026-05-23T09:00:00.000Z",
        platform: "android",
        url: "https://pages.lazada.co.th",
      }),
    );
  });
  it("detect > strips URL credentials before upload", async () => {
    const baseClient = createBaseClient();
    const api = createGoGoTrackApi(baseClient);

    await api.detect({
      method: "browser_url",
      observedAt: "2026-05-23T09:00:00.000Z",
      platform: "android",
      url: "https://user:secret@Merchant.Example:8443/path?token=secret#fragment",
    });

    expect(baseClient.post).toHaveBeenCalledWith(
      "/gototrack/detect",
      expect.objectContaining({
        url: "https://merchant.example:8443",
      }),
    );
  });
});
