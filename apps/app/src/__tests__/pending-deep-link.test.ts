import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression (device-verified 2026-07-10): a deep link delivered while
// AppProviders still gates the router behind the session/font bootstrap has no
// subscriber and is silently dropped — the app settles on Home. Same class as
// the fixed bottom-nav press swallow. The pendingDeepLink module captures
// event-delivered URLs during that window and replays them once the navigator
// is ready. (Cold-start URLs are unaffected: expo-router consumes
// getInitialURL itself when the Stack mounts.)

const listeners: Array<(event: { url: string }) => void> = [];
const removeSubscription = vi.fn();
const addEventListener = vi.fn(
  (_type: string, handler: (event: { url: string }) => void) => {
    listeners.push(handler);
    return { remove: removeSubscription };
  },
);

vi.mock("expo-linking", () => ({
  addEventListener: (
    type: string,
    handler: (event: { url: string }) => void,
  ) => addEventListener(type, handler),
}));

import {
  consumePendingDeepLink,
  markNavigatorReady,
  resetPendingDeepLinkForTests,
  resolveDeepLinkReplayTarget,
  subscribeEarlyDeepLinkCapture,
} from "@mobile/navigation/pendingDeepLink";

function emit(url: string) {
  for (const listener of listeners) listener({ url });
}

describe("pendingDeepLink capture", () => {
  beforeEach(() => {
    listeners.length = 0;
    addEventListener.mockClear();
    resetPendingDeepLinkForTests();
    subscribeEarlyDeepLinkCapture();
  });

  it("buffers a url delivered before the navigator is ready and consume clears it", () => {
    emit("gogocash://wallet");

    expect(consumePendingDeepLink()).toBe("gogocash://wallet");
    expect(consumePendingDeepLink()).toBeNull();
  });

  it("keeps only the latest url when several arrive during the gate", () => {
    emit("gogocash://wallet");
    emit("gogocash://quest");

    expect(consumePendingDeepLink()).toBe("gogocash://quest");
  });

  it("does not buffer once the navigator is ready — expo-router owns live links", () => {
    markNavigatorReady();
    emit("gogocash://wallet");

    expect(consumePendingDeepLink()).toBeNull();
  });

  it("subscribes exactly once no matter how often capture is requested", () => {
    subscribeEarlyDeepLinkCapture();
    subscribeEarlyDeepLinkCapture();

    expect(addEventListener).toHaveBeenCalledTimes(1);
  });
});

describe("resolveDeepLinkReplayTarget", () => {
  it("maps a custom-scheme link to its router path", () => {
    expect(resolveDeepLinkReplayTarget("gogocash://wallet")).toBe("/wallet");
  });

  it("keeps nested paths and query strings intact", () => {
    expect(
      resolveDeepLinkReplayTarget("gogocash://auth/callback?token=t&callbackUrl=%2Fwallet"),
    ).toBe("/auth/callback?token=t&callbackUrl=%2Fwallet");
  });

  it("maps universal https links to their path", () => {
    expect(
      resolveDeepLinkReplayTarget("https://app-staging.gogocash.co/wallet?tab=earning"),
    ).toBe("/wallet?tab=earning");
  });

  it("returns null for scheme-only or unparseable urls", () => {
    expect(resolveDeepLinkReplayTarget("gogocash://")).toBeNull();
    expect(resolveDeepLinkReplayTarget("https://app-staging.gogocash.co/")).toBeNull();
    expect(resolveDeepLinkReplayTarget("not a url")).toBeNull();
  });
});
