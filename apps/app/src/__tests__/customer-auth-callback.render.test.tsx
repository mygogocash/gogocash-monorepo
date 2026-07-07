import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Wave B (B1) render coverage for CustomerAuthCallbackScreen — the post-sign-in
// token-handoff STATUS screen (signed-in / pending / expired / failed; no form
// inputs). This MOUNTS the screen (react-native -> react-native-web, happy-dom)
// and drives its REAL state machine via the expo-router param stub, asserting the
// haptic feedback the screen now emits per status transition.
//
// Haptics is the meaningful native win on this screen: success() on the signed-in
// state, error() on expired/failed. We mock @mobile/lib/haptics and assert it
// fires (once, keyed on the status), NOT on every render.

const hapticsSuccess = vi.fn(() => Promise.resolve());
const hapticsError = vi.fn(() => Promise.resolve());

vi.mock("@mobile/lib/haptics", () => ({
  haptics: {
    success: () => hapticsSuccess(),
    error: () => hapticsError(),
    impact: () => Promise.resolve(),
  },
}));

// Drive the screen's state machine deterministically through the param stub.
// expo-router is aliased to a test stub in vitest.render.config.ts; we override
// useLocalSearchParams per test to choose the success vs expired path.
const searchParams: { current: Record<string, string> } = { current: {} };
vi.mock("expo-router", async () => {
  const actual =
    await vi.importActual<typeof import("../test-support/expoRouterStub")>(
      "../test-support/expoRouterStub"
    );
  return {
    ...actual,
    useLocalSearchParams: () => searchParams.current,
  };
});

// Keep persistence deterministic: a resolved secure store so the success path
// reaches setState("success") without depending on expo-secure-store under
// happy-dom. The screen imports these from @mobile/auth/session.
vi.mock("@mobile/auth/session", () => ({
  persistMobileSession: vi.fn(() => Promise.resolve()),
}));

import { CustomerAuthCallbackScreen } from "@mobile/screens/CustomerAuthCallbackScreen";

beforeEach(() => {
  hapticsSuccess.mockClear();
  hapticsError.mockClear();
  searchParams.current = {};
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("CustomerAuthCallbackScreen (render)", () => {
  it("mounts without throwing on the pending/expired path", () => {
    expect(() => render(createElement(CustomerAuthCallbackScreen))).not.toThrow();
  });

  it("fires haptics.success exactly once when it reaches the signed-in state", async () => {
    // A clean dev raw token drives code -> session -> persist -> setState("success").
    searchParams.current = { token: "valid-callback-token" };

    render(createElement(CustomerAuthCallbackScreen));

    await waitFor(() => {
      expect(hapticsSuccess).toHaveBeenCalledTimes(1);
    });
    expect(hapticsError).not.toHaveBeenCalled();
  });

  it("fires haptics.error on the expired state (no code, no token)", async () => {
    searchParams.current = {};

    render(createElement(CustomerAuthCallbackScreen));

    await waitFor(() => {
      expect(hapticsError).toHaveBeenCalledTimes(1);
    });
    expect(hapticsSuccess).not.toHaveBeenCalled();
    // Sanity: the expired-state copy renders.
    expect(screen.getByText("Sign-in link expired")).toBeTruthy();
  });
});
