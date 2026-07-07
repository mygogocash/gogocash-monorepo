import { describe, expect, it, vi } from "vitest";

import { createGoGoTrackPromptCoordinator } from "@mobile/gototrack/promptCoordinator";

const samplePayload = {
  packageName: "com.shopee.th",
  detectionEventId: "det-1",
  merchantId: "shopee",
  merchantName: "Shopee",
  offerId: 101,
  networkMerchantId: 201,
};

describe("GoGoTrackPromptCoordinator", () => {
  it("activateFromNative > given match payload > then calls activate once and opens deeplink", async () => {
    const activate = vi.fn(async () => ({
      activationEventId: "act-1",
      deeplink: "https://track.gogocash.co/shopee",
    }));
    const openUrl = vi.fn(async () => undefined);
    const coordinator = createGoGoTrackPromptCoordinator({
      api: { activate },
      openUrl,
    });

    coordinator.showNativePrompt(samplePayload);

    await expect(coordinator.activateFromNative(samplePayload)).resolves.toEqual({
      deeplink: "https://track.gogocash.co/shopee",
    });

    expect(activate).toHaveBeenCalledOnce();
    expect(activate).toHaveBeenCalledWith({
      detectionEventId: "det-1",
      merchantId: "shopee",
      offerId: 101,
      networkMerchantId: 201,
      source: "gototrack_background_prompt",
    });
    expect(openUrl).toHaveBeenCalledWith("https://track.gogocash.co/shopee");
    expect(coordinator.getState().nativePromptActive).toBe(false);
  });

  it("dismissFromNative > then does not activate", async () => {
    const activate = vi.fn();
    const coordinator = createGoGoTrackPromptCoordinator({
      api: { activate },
    });

    coordinator.showNativePrompt(samplePayload);
    coordinator.dismissFromNative(samplePayload);

    await expect(coordinator.activateFromNative(samplePayload)).resolves.toBeNull();
    expect(activate).not.toHaveBeenCalled();
    expect(coordinator.getState().nativePromptActive).toBe(false);
  });

  it("showNativePrompt > given cooldown window > then suppresses duplicate prompts", () => {
    let nowMs = 0;
    const coordinator = createGoGoTrackPromptCoordinator({
      api: { activate: vi.fn() },
      cooldownMs: 5 * 60 * 1000,
      now: () => new Date(nowMs),
    });

    expect(coordinator.showNativePrompt(samplePayload)).toBe(true);
    expect(coordinator.getState().nativePromptActive).toBe(true);

    nowMs = 60_000;
    expect(coordinator.showNativePrompt(samplePayload)).toBe(false);

    nowMs = 5 * 60 * 1000;
    expect(coordinator.showNativePrompt(samplePayload)).toBe(true);
  });

  it("activateFromNative > given cooldown suppressed showNativePrompt > then still activates from payload", async () => {
    let nowMs = 0;
    const activate = vi.fn(async () => ({
      activationEventId: "act-2",
      deeplink: "https://track.gogocash.co/shopee",
    }));
    const openUrl = vi.fn(async () => undefined);
    const coordinator = createGoGoTrackPromptCoordinator({
      api: { activate },
      cooldownMs: 5 * 60 * 1000,
      now: () => new Date(nowMs),
      openUrl,
    });

    expect(coordinator.showNativePrompt(samplePayload)).toBe(true);
    await coordinator.activateFromNative(samplePayload);
    expect(coordinator.getState().nativePromptActive).toBe(false);

    nowMs = 60_000;
    expect(coordinator.showNativePrompt(samplePayload)).toBe(false);
    expect(coordinator.getState().nativePromptActive).toBe(false);

    await expect(coordinator.activateFromNative(samplePayload)).resolves.toEqual({
      deeplink: "https://track.gogocash.co/shopee",
    });

    expect(activate).toHaveBeenCalledTimes(2);
    expect(openUrl).toHaveBeenCalledTimes(2);
  });

  it("shouldSuppressBanner > given active native prompt > then hides hub banner for same match", () => {
    const coordinator = createGoGoTrackPromptCoordinator({
      api: { activate: vi.fn() },
    });

    coordinator.showNativePrompt(samplePayload);

    expect(
      coordinator.shouldSuppressBanner("com.shopee.th:det-1"),
    ).toBe(true);
    expect(coordinator.shouldSuppressBanner("com.lazada.android:other")).toBe(true);
    expect(coordinator.shouldSuppressBanner(null)).toBe(true);
  });

  it("subscribe > given showNativePrompt or dismissFromNative > then notifies listeners", () => {
    const listener = vi.fn();
    const coordinator = createGoGoTrackPromptCoordinator({
      api: { activate: vi.fn() },
    });

    const unsubscribe = coordinator.subscribe(listener);
    coordinator.showNativePrompt(samplePayload);
    expect(listener).toHaveBeenCalledTimes(1);

    coordinator.dismissFromNative(samplePayload);
    expect(listener).toHaveBeenCalledTimes(2);

    listener.mockClear();
    unsubscribe();
    coordinator.showNativePrompt(samplePayload);
    expect(listener).not.toHaveBeenCalled();
  });
});
