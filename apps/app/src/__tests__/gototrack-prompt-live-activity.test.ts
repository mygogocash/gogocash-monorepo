import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("react-native", () => ({
  Linking: { openURL: vi.fn(async () => undefined) },
}));

import {
  bindLiveActivityLoader,
  payloadToLiveActivity,
  resetLiveActivityLoaderForTests,
  syncLiveActivityWithPromptState,
} from "@mobile/gototrack/promptLiveActivityBridge";
import {
  configureGoGoTrackPromptCoordinator,
  resetGoGoTrackPromptCoordinatorForTests,
} from "@mobile/gototrack/promptCoordinatorInstance";

const samplePayload = {
  packageName: "com.shopee.th",
  detectionEventId: "det-1",
  merchantId: "shopee",
  merchantName: "Shopee",
  offerId: 101,
  networkMerchantId: 201,
};

describe("GoGoTrack Live Activity bridge", () => {
  beforeEach(() => {
    resetLiveActivityLoaderForTests();
    resetGoGoTrackPromptCoordinatorForTests();
  });

  it("payloadToLiveActivity > given coordinator payload > then maps merchant fields", () => {
    expect(payloadToLiveActivity(samplePayload)).toEqual({
      merchantName: "Shopee",
      merchantId: "shopee",
      detectionEventId: "det-1",
      offerId: 101,
      networkMerchantId: 201,
      packageName: "com.shopee.th",
    });
  });

  it("syncLiveActivityWithPromptState > given active prompt > then starts Live Activity", () => {
    const module = {
      startActivationPrompt: vi.fn(async () => undefined),
      endActivationPrompt: vi.fn(async () => undefined),
      updateActivationPrompt: vi.fn(async () => undefined),
    };

    syncLiveActivityWithPromptState(
      { nativePromptActive: true, activePayload: samplePayload },
      module,
    );

    expect(module.startActivationPrompt).toHaveBeenCalledWith(
      payloadToLiveActivity(samplePayload),
    );
    expect(module.endActivationPrompt).not.toHaveBeenCalled();
  });

  it("syncLiveActivityWithPromptState > given inactive prompt > then ends Live Activity", () => {
    const module = {
      startActivationPrompt: vi.fn(async () => undefined),
      endActivationPrompt: vi.fn(async () => undefined),
      updateActivationPrompt: vi.fn(async () => undefined),
    };

    syncLiveActivityWithPromptState(
      { nativePromptActive: false, activePayload: null },
      module,
    );

    expect(module.endActivationPrompt).toHaveBeenCalledOnce();
    expect(module.startActivationPrompt).not.toHaveBeenCalled();
  });

  it("configureGoGoTrackPromptCoordinator > given show/dismiss > then syncs bound Live Activity module", () => {
    const module = {
      startActivationPrompt: vi.fn(async () => undefined),
      endActivationPrompt: vi.fn(async () => undefined),
      updateActivationPrompt: vi.fn(async () => undefined),
    };
    bindLiveActivityLoader(() => module);

    const coordinator = configureGoGoTrackPromptCoordinator({
      activate: vi.fn(),
    });

    coordinator.showNativePrompt(samplePayload);
    expect(module.startActivationPrompt).toHaveBeenCalledOnce();

    coordinator.dismissFromNative(samplePayload);
    expect(module.endActivationPrompt).toHaveBeenCalledOnce();
  });
});
