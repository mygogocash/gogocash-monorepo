import { describe, expect, it, vi } from "vitest";

import { createGoGoSenseApi } from "@mobile/gogosense/api";
import type { GoGoSenseBaseClient } from "@mobile/gogosense/api";

function createBaseClient() {
  return {
    get: vi.fn(async () => ({ ok: true })) as unknown as GoGoSenseBaseClient["get"],
    post: vi.fn(async () => ({ ok: true })) as unknown as GoGoSenseBaseClient["post"],
  } as GoGoSenseBaseClient & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
}

describe("GoGoSense mobile API wrapper", () => {
  it("detection api > given package detection > then posts detection body to backend", async () => {
    const baseClient = createBaseClient();
    const api = createGoGoSenseApi(baseClient);

    await api.detect({
      method: "android_package",
      packageName: "com.shopee.th",
      observedAt: "2026-05-23T09:00:00.000Z",
      platform: "android",
    });

    expect(baseClient.post).toHaveBeenCalledWith("/gogosense/detect", {
      method: "android_package",
      packageName: "com.shopee.th",
      observedAt: "2026-05-23T09:00:00.000Z",
      platform: "android",
    });
  });

  it("activation api > given matched merchant > then posts activation body to backend", async () => {
    const baseClient = createBaseClient();
    const api = createGoGoSenseApi(baseClient);

    await api.activate({
      detectionEventId: "detection-1",
      merchantId: "merchant-shopee",
      offerId: 101,
      networkMerchantId: 201,
      source: "gogosense",
    });

    expect(baseClient.post).toHaveBeenCalledWith("/gogosense/activate", {
      detectionEventId: "detection-1",
      merchantId: "merchant-shopee",
      offerId: 101,
      networkMerchantId: 201,
      source: "gogosense",
    });
  });

  it("settings api > given partial settings > then posts settings body to backend", async () => {
    const baseClient = createBaseClient();
    const api = createGoGoSenseApi(baseClient);

    await api.updateSettings({ enabled: true });

    expect(baseClient.post).toHaveBeenCalledWith("/gogosense/settings", {
      enabled: true,
    });
  });
});
