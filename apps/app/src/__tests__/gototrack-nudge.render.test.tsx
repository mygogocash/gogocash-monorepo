import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

const useGoGoTrackApiMock = vi.fn<() => GoGoTrackHookApi | null>(() => null);

vi.mock("@mobile/gototrack/useGoGoTrackApi", () => ({
  useGoGoTrackApi: () => useGoGoTrackApiMock(),
}));

import { ApiError } from "@mobile/api/client";
import { toastErrorMessages } from "@mobile/i18n/toastMessages";
import type { GoGoTrackDetector } from "@mobile/gototrack/detector";
import { GoGoTrackDetectionBanner } from "@mobile/gototrack/GoGoTrackDetectionBanner";
import {
  configureGoGoTrackPromptCoordinator,
  resetGoGoTrackPromptCoordinatorForTests,
} from "@mobile/gototrack/promptCoordinatorInstance";
import type { GoGoTrackHookApi } from "@mobile/gototrack/useGoGoTrack";

function detector(pkg: string | null): GoGoTrackDetector {
  return {
    isAndroidSupported: () => true,
    hasUsageAccessPermission: vi.fn(async () => true),
    openUsageAccessSettings: vi.fn(async () => undefined),
    hasNotificationListenerPermission: vi.fn(async () => false),
    openNotificationListenerSettings: vi.fn(async () => undefined),
    getCurrentForegroundPackage: vi.fn(async () => pkg),
    startDetection: vi.fn(async () => undefined),
    stopDetection: vi.fn(async () => undefined),
  };
}

describe("GoGoTrackDetectionBanner (render)", () => {
  it("authed api > given useGoGoTrackApi resolves after mount > then polls with the live api", async () => {
    const detect = vi.fn(async () => ({
      matched: true,
      merchantId: "shopee",
      merchantName: "Shopee",
      offerId: 101,
      networkMerchantId: 201,
      recommendedAction: "activate" as const,
    }));
    useGoGoTrackApiMock.mockReturnValueOnce(null).mockReturnValue({
      detect,
      activate: vi.fn(async () => ({
        activationEventId: "e1",
        deeplink: "https://track.gogocash.co/shopee",
      })),
    });

    const { rerender } = render(
      createElement(GoGoTrackDetectionBanner, {
        detector: detector("com.shopee.th"),
        openUrl: vi.fn(),
      }),
    );

    expect(screen.queryByText("Activate cashback")).toBeNull();

    rerender(
      createElement(GoGoTrackDetectionBanner, {
        detector: detector("com.shopee.th"),
        openUrl: vi.fn(),
      }),
    );

    expect(await screen.findByText("Activate cashback")).toBeTruthy();
    expect(detect).toHaveBeenCalled();
  });

  it("matched detection > shows the activate nudge and opens the deeplink", async () => {
    const api: GoGoTrackHookApi = {
      detect: vi.fn(async () => ({
        matched: true,
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
        recommendedAction: "activate" as const,
      })),
      activate: vi.fn(async () => ({
        activationEventId: "e1",
        deeplink: "https://track.gogocash.co/shopee",
      })),
    };
    const openUrl = vi.fn();

    await act(async () => {
      render(
        createElement(GoGoTrackDetectionBanner, {
          detector: detector("com.shopee.th"),
          api,
          openUrl,
        }),
      );
    });

    const button = await screen.findByText("Activate cashback");
    const activationButton = screen.getByTestId("gototrack-activate-cashback-button");
    expect(screen.getByLabelText("Activate cashback for Shopee")).toBe(activationButton);
    expect(activationButton.getAttribute("role")).toBe("button");

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => expect(api.activate).toHaveBeenCalled());
    expect(openUrl).toHaveBeenCalledWith("https://track.gogocash.co/shopee");
    await waitFor(() => expect(screen.queryByText("Activate cashback")).toBeNull());
  });

  it("no match > renders nothing", async () => {
    const api: GoGoTrackHookApi = { detect: vi.fn(async () => ({ matched: false })) };

    await act(async () => {
      render(
        createElement(GoGoTrackDetectionBanner, {
          detector: detector("com.unknown.app"),
          api,
          openUrl: vi.fn(),
        }),
      );
    });

    expect(screen.queryByText("Activate cashback")).toBeNull();
  });
});

describe("GoGoTrackDetectionBanner incomplete activation matches", () => {
  it("matched detection > given activation fields are missing > shows activation failure instead of a dead button", async () => {
    const api: GoGoTrackHookApi = {
      detect: vi.fn(async () => ({
        matched: true,
        merchantId: "shopee",
        merchantName: "Shopee",
        recommendedAction: "activate" as const,
      })),
      activate: vi.fn(),
    };
    const openUrl = vi.fn();

    render(
      createElement(GoGoTrackDetectionBanner, {
        api,
        detector: detector("com.shopee.th"),
        openUrl,
      })
    );

    await act(async () => {});
    const button = await screen.findByText("Activate cashback");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(api.activate).not.toHaveBeenCalled();
    expect(openUrl).not.toHaveBeenCalled();
    expect(await screen.findByText(toastErrorMessages.cashbackActivationFailed)).toBeTruthy();
  });
});

describe("GoGoTrackDetectionBanner prompt coordinator subscription", () => {
  beforeEach(() => {
    resetGoGoTrackPromptCoordinatorForTests();
  });

  it("matched detection > given native prompt becomes active > then hides banner without repolling", async () => {
    const api: GoGoTrackHookApi = {
      detect: vi.fn(async () => ({
        matched: true,
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
        detectionEventId: "det-1",
        recommendedAction: "activate" as const,
      })),
      activate: vi.fn(),
    };
    const coordinator = configureGoGoTrackPromptCoordinator({ activate: vi.fn() });

    await act(async () => {
      render(
        createElement(GoGoTrackDetectionBanner, {
          detector: detector("com.shopee.th"),
          api,
          openUrl: vi.fn(),
        }),
      );
    });

    expect(await screen.findByText("Activate cashback")).toBeTruthy();

    act(() => {
      coordinator.showNativePrompt({
        packageName: "com.shopee.th",
        detectionEventId: "det-1",
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
      });
    });

    expect(screen.queryByText("Activate cashback")).toBeNull();
  });

  it("matched detection > given native prompt dismissed > then shows banner again", async () => {
    const api: GoGoTrackHookApi = {
      detect: vi.fn(async () => ({
        matched: true,
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
        detectionEventId: "det-1",
        recommendedAction: "activate" as const,
      })),
      activate: vi.fn(),
    };
    const coordinator = configureGoGoTrackPromptCoordinator({ activate: vi.fn() });
    const payload = {
      packageName: "com.shopee.th",
      detectionEventId: "det-1",
      merchantId: "shopee",
      merchantName: "Shopee",
      offerId: 101,
      networkMerchantId: 201,
    };

    await act(async () => {
      render(
        createElement(GoGoTrackDetectionBanner, {
          detector: detector("com.shopee.th"),
          api,
          openUrl: vi.fn(),
        }),
      );
    });

    expect(await screen.findByText("Activate cashback")).toBeTruthy();

    act(() => {
      coordinator.showNativePrompt(payload);
    });
    expect(screen.queryByText("Activate cashback")).toBeNull();

    act(() => {
      coordinator.dismissFromNative(payload);
    });
    expect(await screen.findByText("Activate cashback")).toBeTruthy();
  });
});

describe("GoGoTrackDetectionBanner activation failures", () => {
  it("matched detection > given activation rejects > does not open a stale deeplink", async () => {
    const activate = vi
      .fn()
      .mockRejectedValueOnce(new Error("Unauthorized"))
      .mockResolvedValueOnce({
        activationEventId: "e2",
        deeplink: "https://track.gogocash.co/retry",
      });
    const api: GoGoTrackHookApi = {
      detect: vi.fn(async () => ({
        matched: true,
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
        recommendedAction: "activate" as const,
      })),
      activate,
    };
    const openUrl = vi.fn();

    render(
      createElement(GoGoTrackDetectionBanner, {
        api,
        detector: detector("com.shopee.th"),
        openUrl,
      })
    );

    await act(async () => {});
    const button = await screen.findByText("Activate cashback");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(api.activate).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalled();
    expect(await screen.findByText(toastErrorMessages.cashbackActivationFailed)).toBeTruthy();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(api.activate).toHaveBeenCalledTimes(2);
    expect(openUrl).toHaveBeenCalledWith("https://track.gogocash.co/retry");
    expect(screen.queryByText(toastErrorMessages.cashbackActivationFailed)).toBeNull();
  });

  it("matched detection > given activation rejects with an ApiError > shows the localized copy, never the raw upstream text", async () => {
    // Regression: the catch block rendered `error.message` verbatim, so an upstream failure like
    // "Request failed with status 500" leaked into the on-screen banner. It must show the already-
    // localized activation-failure copy instead — never the raw status string.
    const rawUpstream = "Request failed with status 500";
    const activate = vi.fn().mockRejectedValue(new ApiError(rawUpstream, 500));
    const api: GoGoTrackHookApi = {
      detect: vi.fn(async () => ({
        matched: true,
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
        recommendedAction: "activate" as const,
      })),
      activate,
    };

    render(
      createElement(GoGoTrackDetectionBanner, {
        api,
        detector: detector("com.shopee.th"),
        openUrl: vi.fn(),
      })
    );

    await act(async () => {});
    const button = await screen.findByText("Activate cashback");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(await screen.findByText(toastErrorMessages.cashbackActivationFailed)).toBeTruthy();
    expect(screen.queryByText(rawUpstream)).toBeNull();
  });

  it("activation in flight > ignores rapid duplicate taps until the request settles", async () => {
    type ActivateFn = NonNullable<GoGoTrackHookApi["activate"]>;
    let resolveActivation!: (value: Awaited<ReturnType<ActivateFn>>) => void;
    const activationPromise = new Promise<Awaited<ReturnType<ActivateFn>>>((resolve) => {
      resolveActivation = resolve;
    });
    const activate = vi.fn(() => activationPromise);
    const api: GoGoTrackHookApi = {
      detect: vi.fn(async () => ({
        matched: true,
        merchantId: "shopee",
        merchantName: "Shopee",
        offerId: 101,
        networkMerchantId: 201,
        detectionEventId: "e3",
        recommendedAction: "activate" as const,
      })),
      activate,
    };
    const openUrl = vi.fn();

    await act(async () => {
      render(
        createElement(GoGoTrackDetectionBanner, {
          detector: detector("com.shopee.th"),
          api,
          openUrl,
        }),
      );
    });

    await screen.findByText("Cashback available");

    const button = screen.getByText("Activate cashback");
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(activate).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Activating cashback")).toBeTruthy();

    await act(async () => {
      resolveActivation({
        activationEventId: "activation-3",
        deeplink: "https://track.gogocash.co/shopee",
      });
      await activationPromise;
    });

    await waitFor(() => expect(openUrl).toHaveBeenCalledWith("https://track.gogocash.co/shopee"));
  });
});
